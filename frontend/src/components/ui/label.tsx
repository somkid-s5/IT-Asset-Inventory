"use client"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

interface LabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  required?: boolean
  optional?: boolean
}

function Label({
  className,
  required,
  optional,
  children,
  ...props
}: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-[12px] leading-none font-semibold uppercase tracking-[0.14em] text-foreground/88 select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-destructive">*</span>}
      {optional && (
        <span className="text-[11px] font-normal lowercase tracking-normal text-muted-foreground">
          (optional)
        </span>
      )}
    </LabelPrimitive.Root>
  )
}

export { Label }
