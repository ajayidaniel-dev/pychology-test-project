"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function SidebarCollapseTrigger({ className }: { className?: string }) {
  const { toggleSidebar, state } = useSidebar();
  const collapsed = state === "collapsed";
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-sidebar="rail"
          data-slot="sidebar-rail"
          aria-label={label}
          title={label}
          className={cn(
            "absolute top-40 right-0 z-50 hidden size-7 -translate-y-1/2 translate-x-1/2 md:flex",
            "items-center justify-center rounded-full",
            "border border-sidebar-border bg-background text-foreground shadow-md",
            "transition-colors hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            className,
          )}
          onClick={toggleSidebar}
        >
          {collapsed ? (
            <ChevronRight className="size-4 shrink-0" strokeWidth={2.25} />
          ) : (
            <ChevronLeft className="size-4 shrink-0" strokeWidth={2.25} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
