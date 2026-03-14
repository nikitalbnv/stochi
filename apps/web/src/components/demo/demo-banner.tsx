"use client";

import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "~/components/ui/button";

export function DemoBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="relative border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 px-4 py-2"
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 text-xs sm:text-sm">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="text-amber-200/90">
              <span className="font-medium">Demo Mode</span>
              <span className="text-amber-200/60"> - </span>
              <span className="hidden text-amber-200/70 sm:inline">
                Interactive sample workspace with resettable seeded data.
              </span>
              <span className="text-amber-200/70 sm:hidden">
                Seeded demo, resets anytime
              </span>
            </span>
            <Button
              asChild
              size="sm"
              className="ml-2 h-auto min-h-6 rounded-md bg-amber-500/20 px-3 py-1 text-[10px] font-medium whitespace-normal text-amber-300 hover:bg-amber-500/30 hover:text-amber-200"
            >
              <Link href="/auth/sign-up">
                Create an account to save real protocols, logs, and settings.
              </Link>
            </Button>
            <button
              onClick={() => setIsDismissed(true)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-amber-400/50 transition-colors hover:bg-amber-500/10 hover:text-amber-400 sm:right-4"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
