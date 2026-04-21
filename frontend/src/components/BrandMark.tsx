"use client"

import { Shield } from "lucide-react"
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
    <div className={cn("flex items-center gap-3", compact && "gap-0", className)}>
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-primary/30 bg-primary text-primary-foreground shadow-sm">
        <div className="absolute inset-[1px] rounded-md bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_55%)]" />
        <Shield className="relative h-4 w-4" />
      </div>

      <div className={cn("min-w-0", compact && "hidden")}>
        <p className={cn("font-sans text-base font-semibold tracking-tight", titleClass)}>
          AssetOps
        </p>
        {!compact && (
          <p className={cn("text-[10px] font-medium uppercase tracking-[0.08em]", subtitleClass)}>
            ระบบจัดการสินทรัพย์ไอที
          </p>
        )}
      </div>
    </div>
  )
}
