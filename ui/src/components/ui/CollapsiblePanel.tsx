"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { Panel } from "./Panel";
import { cn } from "@/lib/utils";

interface CollapsiblePanelProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  /** Compact status shown on the right of the header (visible while collapsed). */
  badge?: ReactNode;
  /** Start expanded. Panels default to collapsed one-liners. */
  defaultOpen?: boolean;
  delay?: number;
  className?: string;
  /** Classes applied to the expanding body wrapper. */
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * A glass panel that collapses to a single icon + title row and expands its
 * content on click. Keeps the dashboard clean: panels stay out of the way until
 * the user opens them.
 */
export function CollapsiblePanel({
  icon,
  title,
  subtitle,
  badge,
  defaultOpen = false,
  delay = 0,
  className,
  bodyClassName,
  children,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Panel className={cn("overflow-hidden", className)} delay={delay}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ocean-50/40"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ocean-50 text-ocean-600 ring-1 ring-ocean-100">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight text-ocean-800">
            {title}
          </h2>
          {subtitle ? (
            <p className="truncate text-xs leading-snug text-ocean-600/80">
              {subtitle}
            </p>
          ) : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 text-ocean-400"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className={cn("border-t border-ocean-100/70", bodyClassName)}>
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Panel>
  );
}
