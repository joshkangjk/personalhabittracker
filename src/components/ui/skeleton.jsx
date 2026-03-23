import React from "react"
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }) {
  return (
    <div
      // We use rounded-2xl as the default to match your Apple cards!
      className={cn("animate-pulse rounded-2xl bg-muted/60", className)}
      {...props} 
    />
  )
}

export { Skeleton }