import { type GoalKey } from "~/server/data/goal-recommendations";

type DosageUnit = "mg" | "mcg" | "g" | "IU" | "ml";
type TimeSlot = "morning" | "afternoon" | "evening" | "bedtime";

interface TemplateSupplementInput {
  supplementName: string;
  dosage: number;
  unit: DosageUnit;
}

interface OnboardingSupplementInput {
  supplementId: string;
  dosage: number;
  unit: DosageUnit;
  timeSlot?: TimeSlot;
}

export function buildTemplateStackPayloads({
  stackId,
  userId,
  templateSupplements,
  supplementMap,
  loggedAt,
}: {
  stackId: string;
  userId: string;
  templateSupplements: TemplateSupplementInput[];
  supplementMap: Map<string, string>;
  loggedAt: Date;
}) {
  const stackItems = templateSupplements.map((item) => ({
    stackId,
    supplementId: requireSupplementId(supplementMap, item.supplementName),
    dosage: item.dosage,
    unit: item.unit,
  }));

  const logs = templateSupplements.map((item) => ({
    userId,
    supplementId: requireSupplementId(supplementMap, item.supplementName),
    dosage: item.dosage,
    unit: item.unit,
    loggedAt,
  }));

  return { stackItems, logs };
}

export function buildOnboardingStackItems({
  stackId,
  supplements,
}: {
  stackId: string;
  supplements: OnboardingSupplementInput[];
}) {
  return supplements.map((item) => ({
    stackId,
    supplementId: item.supplementId,
    dosage: item.dosage,
    unit: item.unit,
  }));
}

export function buildOnboardingProtocolItems({
  protocolId,
  stackName,
  supplements,
  now,
}: {
  protocolId: string;
  stackName: string;
  supplements: OnboardingSupplementInput[];
  now: Date;
}) {
  return supplements.map((item, index) => ({
    protocolId,
    supplementId: item.supplementId,
    dosage: item.dosage,
    unit: item.unit,
    timeSlot: item.timeSlot ?? "morning",
    frequency: "daily" as const,
    groupName: stackName,
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  }));
}

export function buildGoalInserts({
  userId,
  goals,
  now,
}: {
  userId: string;
  goals: GoalKey[];
  now: Date;
}) {
  return goals.map((goal, index) => ({
    userId,
    goal,
    priority: index + 1,
    createdAt: now,
  }));
}

function requireSupplementId(
  supplementMap: Map<string, string>,
  supplementName: string,
) {
  const supplementId = supplementMap.get(supplementName);
  if (!supplementId) {
    throw new Error(`Missing supplement id for ${supplementName}`);
  }
  return supplementId;
}
