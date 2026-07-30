"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  Layers,
  LayoutDashboard,
  Loader2,
  Plus,
  Settings,
  Users,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import type { SearchIndex } from "@/app/api/navigation/search/route"

interface CommandPaletteContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) {
    throw new Error("useCommandPalette must be used inside CommandPaletteProvider")
  }
  return ctx
}

const EMPTY_INDEX: SearchIndex = { patients: [], scales: [], batches: [] }

const ROUTES = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/batches", label: "Batches", icon: Layers },
  { href: "/scales", label: "Scales", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
] as const

const ACTIONS = [
  { href: "/batches/new", label: "New batch", icon: Plus },
  { href: "/scales/new", label: "New scale", icon: Plus },
] as const

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return
      // Don't hijack the shortcut while the user is mid-word in a field.
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return
      }
      event.preventDefault()
      setOpen((prev) => !prev)
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const value = useMemo(() => ({ open, setOpen }), [open])

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette />
    </CommandPaletteContext.Provider>
  )
}

function CommandPalette() {
  const router = useRouter()
  const { open, setOpen } = useCommandPalette()
  const [index, setIndex] = useState<SearchIndex>(EMPTY_INDEX)
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle")

  // Loaded on first open, then kept. A clinician who opens the palette twice in
  // a row should not wait twice.
  useEffect(() => {
    if (!open || state !== "idle") return

    let cancelled = false
    setState("loading")
    fetch("/api/navigation/search")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
      .then((data: SearchIndex) => {
        if (cancelled) return
        setIndex(data)
        setState("ready")
      })
      .catch(() => {
        if (!cancelled) setState("error")
      })

    return () => {
      cancelled = true
    }
  }, [open, state])

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router, setOpen],
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search APAS"
      description="Jump to a patient, scale, or batch, or run an action."
    >
      <CommandInput placeholder="Search patients, scales, batches…" />
      <CommandList>
        <CommandEmpty>
          {state === "loading" ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading your workspace…
            </span>
          ) : state === "error" ? (
            "Couldn't load search. Check your connection and reopen."
          ) : (
            "No matches."
          )}
        </CommandEmpty>

        <CommandGroup heading="Go to">
          {ROUTES.map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} value={`goto ${label}`} onSelect={() => go(href)}>
              <Icon />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Create">
          {ACTIONS.map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} value={label} onSelect={() => go(href)}>
              <Icon />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        {index.patients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Patients">
              {index.patients.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.label} ${p.hint ?? ""}`}
                  onSelect={() => go(`/patients/${p.id}`)}
                >
                  <Users />
                  <span className="font-mono text-xs tabular-nums">{p.label}</span>
                  {p.hint && (
                    <span className="truncate text-muted-foreground">{p.hint}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {index.scales.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Scales">
              {index.scales.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.label}
                  onSelect={() => go(`/scales/${s.id}`)}
                >
                  <BookOpen />
                  {s.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {index.batches.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Batches">
              {index.batches.map((b) => (
                <CommandItem
                  key={b.id}
                  value={b.label}
                  onSelect={() => go(`/batches/${b.id}`)}
                >
                  <Layers />
                  {b.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="flex items-center justify-end gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
        <span>Navigate</span>
        <CommandShortcut>↑↓</CommandShortcut>
        <span>Open</span>
        <CommandShortcut>↵</CommandShortcut>
        <span>Close</span>
        <CommandShortcut>esc</CommandShortcut>
      </div>
    </CommandDialog>
  )
}
