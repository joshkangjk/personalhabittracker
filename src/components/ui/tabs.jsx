"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(({ className, ...props }, ref) => {
  const listRef = React.useRef(null)
  const [pillStyle, setPillStyle] = React.useState({ width: 0, left: 0, opacity: 0 })

  React.useEffect(() => {
    // This function finds exactly where the active tab is and measures its width/position
    const updatePill = () => {
      if (!listRef.current) return
      const activeTab = listRef.current.querySelector('[data-state="active"]')
      if (activeTab) {
        setPillStyle({
          width: activeTab.offsetWidth,
          left: activeTab.offsetLeft,
          opacity: 1, // Fade in instantly on mount
        })
      }
    }

    updatePill()

    // Watch Radix UI for when the user clicks a new tab and changes the 'data-state'
    const observer = new MutationObserver(updatePill)
    if (listRef.current) {
      observer.observe(listRef.current, { 
        attributes: true, 
        subtree: true, 
        attributeFilter: ['data-state'] 
      })
    }
    
    // Recalculate if the user resizes their window
    window.addEventListener('resize', updatePill)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updatePill)
    }
  }, [])

  // Combine the forwarded ref with our internal tracking ref
  const combinedRef = React.useCallback(
    (node) => {
      listRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  return (
    <TabsPrimitive.List
      ref={combinedRef}
      className={cn(
        // The track: relative positioning is critical here!
        "relative inline-flex h-9 items-center justify-center rounded-full bg-muted/60 p-1 text-muted-foreground shadow-inner",
        className
      )}
      {...props}
    >
      {/* THE LIQUID GLASS PILL */}
      <div
        className="absolute top-1 bottom-1 left-0 rounded-full bg-background shadow-sm z-0"
        style={{
          width: pillStyle.width,
          transform: `translateX(${pillStyle.left}px)`,
          opacity: pillStyle.opacity,
          // Apple's signature liquid spring curve (Expo Out)
          transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), width 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-in",
        }}
      />
      {props.children}
    </TabsPrimitive.List>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // The Text: Notice we removed the background colors completely and added `relative z-10`
      "relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1 text-[13px] font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "hover:text-foreground/80",
      // Text just turns pure black/white when active, the pill handles the background
      "data-[state=active]:text-foreground",
      className
    )}
    {...props} />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }