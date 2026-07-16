"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const LEDGER = [
  {
    title: "Real-time clinical alerts",
    description: "Severity thresholds surface what needs attention first.",
    datum: "<1 s to signal",
  },
  {
    title: "Longitudinal score tracking",
    description: "Standard instruments and custom scales in one view.",
    datum: "PHQ-9 · GAD-7 · BDI-II",
  },
  {
    title: "Consent-first privacy",
    description:
      "Patients stay anonymous by default; identity is collected only with explicit consent, per link.",
    datum: "consent, per link",
  },
] as const;

function AuthBrandingPanel() {
  return (
    <div className="relative hidden overflow-hidden lg:flex lg:flex-col">
      <div className="absolute inset-0 bg-auth-panel" />

      {/*
        Severity-trend motif: a longitudinal score line easing below a dashed
        clinical threshold — the product's actual promise, as decoration.
      */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full text-sidebar-primary"
        viewBox="0 0 640 224"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden
      >
        <line
          x1="0"
          y1="72"
          x2="640"
          y2="72"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeDasharray="3 8"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M0 44 L80 68 L160 52 L240 96 L320 88 L400 128 L480 118 L560 152 L640 144 L640 224 L0 224 Z"
          fill="currentColor"
          fillOpacity="0.05"
        />
        <path
          d="M0 44 L80 68 L160 52 L240 96 L320 88 L400 128 L480 118 L560 152 L640 144"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {[
          [80, 68],
          [240, 96],
          [400, 128],
          [560, 152],
        ].map(([x, y]) => (
          <circle
            key={x}
            cx={x}
            cy={y}
            r="3"
            fill="var(--auth-panel)"
            stroke="currentColor"
            strokeOpacity="0.5"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="relative flex h-full flex-col justify-center gap-32 p-14">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/15 text-[13px] font-bold text-primary ring-1 ring-inset ring-primary/25">
              A
            </div>
            <p className="font-mono text-xs tracking-[0.08em] text-auth-panel-muted">
              <span className="font-semibold text-auth-panel-foreground">
                APAS
              </span>{" "}
              · CLINICAL OVERWATCH
            </p>
          </div>

          <p className="max-w-md text-balance text-2xl font-semibold leading-tight tracking-tight text-auth-panel-foreground">
            Clinical intelligence for modern psychology practice
          </p>
          <p className="max-w-md text-[15px] leading-relaxed text-auth-panel-muted">
            Monitor assessments, track severity trends, and act on alerts —
            without leaving your workflow.
          </p>
        </div>

        {/* Feature ledger */}
        <div className="flex max-w-lg flex-col">
          {LEDGER.map(({ title, description, datum }) => (
            <div
              key={title}
              className="flex items-baseline justify-between gap-4 border-t border-auth-panel-foreground/10 py-4"
            >
              <div>
                <p className="text-sm font-medium text-auth-panel-foreground">
                  {title}
                </p>
                <p className="mt-1 text-[13px] leading-normal text-auth-panel-muted">
                  {description}
                </p>
              </div>
              <span className="whitespace-nowrap font-mono text-xs tracking-[0.02em] text-primary">
                {datum}
              </span>
            </div>
          ))}
          <p className="border-t border-auth-panel-foreground/10 pt-4 text-xs text-auth-panel-muted">
            Decision support for licensed clinicians. Not a substitute for
            clinical judgment.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className={cn("relative min-h-screen bg-background", className)}>
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="grid min-h-screen lg:grid-cols-2">
        <AuthBrandingPanel />

        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-8 lg:min-h-0 lg:px-12">
          <div className="mb-8 w-full max-w-md text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <span className="text-sm font-bold text-primary">A</span>
            </div>
            <p className="text-2xl font-semibold tracking-tight">APAS</p>
            <p className="text-sm text-muted-foreground">Clinical Overwatch</p>
          </div>
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
