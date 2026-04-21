"use client"

import { cn } from "@/lib/utils"

interface BrandMarkProps {
  compact?: boolean
  tone?: "default" | "inverse"
  className?: string
}

export function BrandMark({ compact = false, tone = "default", className }: BrandMarkProps) {
  const titleClass = tone === "inverse" ? "text-white" : "text-foreground"
  const subtitleClass = tone === "inverse" ? "text-white/70" : "text-muted-foreground"

  return (
    <div className={cn("flex items-center gap-3.5", compact && "gap-0", className)}>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary shadow-lg shadow-primary/20">
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          className="relative z-10 h-5.5 w-5.5 text-primary-foreground" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
      </div>

      <div className={cn("min-w-0 leading-tight", compact && "hidden")}>
        <p className={cn("font-display text-[17px] font-bold tracking-tight", titleClass)}>
          Asset<span className="text-primary">Ops</span>
        </p>
        <p className={cn("text-[9px] font-bold uppercase tracking-[0.2em] opacity-80", subtitleClass)}>
          Infrastructure
        </p>
      </div>
    </div>
  )
}
