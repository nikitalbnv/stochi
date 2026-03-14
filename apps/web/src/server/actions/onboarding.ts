"use server";

import { revalidatePath } from "next/cache";
import { eq, and, inArray, gte } from "drizzle-orm";

import { db } from "~/server/db";
import {
  stack,
  stackItem,
  log,
  supplement,
  userGoal,
  protocol,
  protocolItem,
  userPreference,
} from "~/server/db/schema";
import { getSession } from "~/server/better-auth/server";
import { getTemplateByKey } from "~/server/data/stack-templates";
import { type GoalKey, goals } from "~/server/data/goal-recommendations";
import { getUserTimezone } from "~/server/actions/preferences";
import { getStartOfDayInTimezone } from "~/lib/utils";
import {
  buildGoalInserts,
  buildOnboardingProtocolItems,
  buildOnboardingStackItems,
  buildTemplateStackPayloads,
} from "./onboarding-payloads";

/**
 * Instantiate a template stack for the user.
 * Creates: stack + stack items + today's logs for each supplement.
 */
export async function instantiateTemplate(
  templateKey: string,
): Promise<{ success: boolean; stackId?: string; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const template = getTemplateByKey(templateKey);
  if (!template) {
    return { success: false, error: "Template not found" };
  }

  // Get supplement IDs by name
  const supplementNames = template.supplements.map((s) => s.supplementName);
  const supplements = await db.query.supplement.findMany({
    where: inArray(supplement.name, supplementNames),
  });

  const supplementMap = new Map(supplements.map((s) => [s.name, s.id]));

  // Verify all supplements exist
  const missingSupplements = supplementNames.filter(
    (name) => !supplementMap.has(name),
  );
  if (missingSupplements.length > 0) {
    return {
      success: false,
      error: `Missing supplements: ${missingSupplements.join(", ")}`,
    };
  }

  const today = new Date();
  today.setHours(8, 0, 0, 0);

  const newStack = await db.transaction(async (tx) => {
    const [createdStack] = await tx
      .insert(stack)
      .values({
        userId: session.user.id,
        name: template.name,
      })
      .returning();

    if (!createdStack) {
      throw new Error("Failed to create stack");
    }

    const payloads = buildTemplateStackPayloads({
      stackId: createdStack.id,
      userId: session.user.id,
      templateSupplements: template.supplements,
      supplementMap,
      loggedAt: today,
    });

    await tx.insert(stackItem).values(payloads.stackItems);
    await tx.insert(log).values(payloads.logs);

    return createdStack;
  });

  if (!newStack) {
    return { success: false, error: "Failed to create stack" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stacks");
  revalidatePath("/dashboard/log");

  return { success: true, stackId: newStack.id };
}

/**
 * Create an empty stack for users who want to start from scratch.
 */
export async function createEmptyStack(): Promise<{
  success: boolean;
  stackId?: string;
  error?: string;
}> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const [newStack] = await db
    .insert(stack)
    .values({
      userId: session.user.id,
      name: "My Stack",
    })
    .returning();

  if (!newStack) {
    return { success: false, error: "Failed to create stack" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stacks");

  return { success: true, stackId: newStack.id };
}

/**
 * Fork a template stack (rename it to remove template detection).
 * Just renames the stack by appending "(Custom)".
 */
export async function forkStack(
  stackId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const userStack = await db.query.stack.findFirst({
    where: and(eq(stack.id, stackId), eq(stack.userId, session.user.id)),
  });

  if (!userStack) {
    return { success: false, error: "Stack not found" };
  }

  // Rename to break template detection
  await db
    .update(stack)
    .set({
      name: `${userStack.name} (Custom)`,
      updatedAt: new Date(),
    })
    .where(eq(stack.id, stackId));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stacks");
  revalidatePath(`/dashboard/stacks/${stackId}`);

  return { success: true };
}

/**
 * Clear template data (nuclear option).
 * Deletes the stack AND all logs from today for its supplements.
 */
export async function clearTemplateData(
  stackId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the stack with its items
  const userStack = await db.query.stack.findFirst({
    where: and(eq(stack.id, stackId), eq(stack.userId, session.user.id)),
    with: {
      items: true,
    },
  });

  if (!userStack) {
    return { success: false, error: "Stack not found" };
  }

  // Get today's start timestamp in user's timezone
  const timezone = await getUserTimezone();
  const todayStart = getStartOfDayInTimezone(timezone);

  // Get supplement IDs from the stack
  const supplementIds = userStack.items.map((item) => item.supplementId);

  await db.transaction(async (tx) => {
    if (supplementIds.length > 0) {
      await tx
        .delete(log)
        .where(
          and(
            eq(log.userId, session.user.id),
            inArray(log.supplementId, supplementIds),
            gte(log.loggedAt, todayStart),
          ),
        );
    }

    await tx.delete(stack).where(eq(stack.id, stackId));
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stacks");
  revalidatePath("/dashboard/log");

  return { success: true };
}

/**
 * Check if user needs onboarding (has no stacks AND no protocol items).
 */
export async function checkNeedsOnboarding(): Promise<boolean> {
  const session = await getSession();
  if (!session) {
    return false;
  }

  // Check for stacks
  const userStacks = await db.query.stack.findMany({
    where: eq(stack.userId, session.user.id),
    limit: 1,
  });

  if (userStacks.length > 0) {
    return false;
  }

  // Check for protocol items
  const userProtocol = await db.query.protocol.findFirst({
    where: eq(protocol.userId, session.user.id),
    with: {
      items: {
        limit: 1,
      },
    },
  });

  if (userProtocol && userProtocol.items.length > 0) {
    return false;
  }

  return true;
}

/**
 * Create a stack and protocol from onboarding flow data.
 * Takes user-selected supplements with dosages and creates:
 * 1. A new stack (for backward compatibility)
 * 2. A protocol with items in the "morning" time slot
 * Optionally saves the selected goals.
 */
export async function createStackFromOnboarding(data: {
  stackName: string;
  supplements: Array<{
    supplementId: string;
    dosage: number;
    unit: "mg" | "mcg" | "g" | "IU" | "ml";
    timeSlot?: "morning" | "afternoon" | "evening" | "bedtime";
  }>;
  goals?: GoalKey[];
  experienceLevel?: "beginner" | "intermediate" | "advanced";
}): Promise<{ success: boolean; stackId?: string; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  if (!data.stackName.trim()) {
    return { success: false, error: "Stack name is required" };
  }

  if (data.supplements.length === 0) {
    return { success: false, error: "At least one supplement is required" };
  }

  // Verify all supplements exist
  const supplementIds = data.supplements.map((s) => s.supplementId);
  const existingSupplements = await db.query.supplement.findMany({
    where: inArray(supplement.id, supplementIds),
  });

  if (existingSupplements.length !== supplementIds.length) {
    return { success: false, error: "Some supplements not found" };
  }

  // Validate goals if provided
  if (data.goals && data.goals.length > 0) {
    const invalidGoals = data.goals.filter(
      (g) => !goals.some((goal) => goal.key === g),
    );
    if (invalidGoals.length > 0) {
      return { success: false, error: "Invalid goals" };
    }
  }

  const stackName = data.stackName.trim();
  const now = new Date();

  const newStack = await db.transaction(async (tx) => {
    const [createdStack] = await tx
      .insert(stack)
      .values({
        userId: session.user.id,
        name: stackName,
      })
      .returning();

    if (!createdStack) {
      throw new Error("Failed to create stack");
    }

    const stackItems = buildOnboardingStackItems({
      stackId: createdStack.id,
      supplements: data.supplements,
    });

    await tx.insert(stackItem).values(stackItems);

    let userProtocolRecord = await tx.query.protocol.findFirst({
      where: eq(protocol.userId, session.user.id),
      columns: { id: true },
    });

    if (!userProtocolRecord) {
      const [newProtocol] = await tx
        .insert(protocol)
        .values({
          userId: session.user.id,
          name: "My Protocol",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (newProtocol) {
        userProtocolRecord = { id: newProtocol.id };
      }
    }

    if (userProtocolRecord) {
      const protocolItems = buildOnboardingProtocolItems({
        protocolId: userProtocolRecord.id,
        stackName,
        supplements: data.supplements,
        now,
      });

      await tx.insert(protocolItem).values(protocolItems);
      await tx
        .update(protocol)
        .set({ updatedAt: now })
        .where(eq(protocol.id, userProtocolRecord.id));
    }

    if (data.goals && data.goals.length > 0) {
      await tx.delete(userGoal).where(eq(userGoal.userId, session.user.id));
      await tx.insert(userGoal).values(
        buildGoalInserts({
          userId: session.user.id,
          goals: data.goals,
          now,
        }),
      );
    }

    if (data.experienceLevel) {
      const existing = await tx.query.userPreference.findFirst({
        where: eq(userPreference.userId, session.user.id),
      });

      if (existing) {
        await tx
          .update(userPreference)
          .set({
            experienceLevel: data.experienceLevel,
            updatedAt: now,
          })
          .where(eq(userPreference.userId, session.user.id));
      } else {
        await tx.insert(userPreference).values({
          userId: session.user.id,
          experienceLevel: data.experienceLevel,
        });
      }
    }

    return createdStack;
  });

  if (!newStack) {
    return { success: false, error: "Failed to create stack" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stacks");
  revalidatePath("/dashboard/settings");

  return { success: true, stackId: newStack.id };
}

/**
 * Create a stack from template WITHOUT creating logs.
 * Used for the "New Stack" dialog on the stacks page.
 */
export async function createStackFromTemplate(
  templateKey: string,
): Promise<{ success: boolean; stackId?: string; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const template = getTemplateByKey(templateKey);
  if (!template) {
    return { success: false, error: "Template not found" };
  }

  // Get supplement IDs by name
  const supplementNames = template.supplements.map((s) => s.supplementName);
  const supplements = await db.query.supplement.findMany({
    where: inArray(supplement.name, supplementNames),
  });

  const supplementMap = new Map(supplements.map((s) => [s.name, s.id]));

  // Verify all supplements exist
  const missingSupplements = supplementNames.filter(
    (name) => !supplementMap.has(name),
  );
  if (missingSupplements.length > 0) {
    return {
      success: false,
      error: `Missing supplements: ${missingSupplements.join(", ")}`,
    };
  }

  const newStack = await db.transaction(async (tx) => {
    const [createdStack] = await tx
      .insert(stack)
      .values({
        userId: session.user.id,
        name: template.name,
      })
      .returning();

    if (!createdStack) {
      throw new Error("Failed to create stack");
    }

    const payloads = buildTemplateStackPayloads({
      stackId: createdStack.id,
      userId: session.user.id,
      templateSupplements: template.supplements,
      supplementMap,
      loggedAt: new Date(),
    });

    await tx.insert(stackItem).values(payloads.stackItems);

    return createdStack;
  });

  if (!newStack) {
    return { success: false, error: "Failed to create stack" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stacks");

  return { success: true, stackId: newStack.id };
}
