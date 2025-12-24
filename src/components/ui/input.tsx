import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const hasWhiteText = className?.includes('!text-white') || className?.includes('text-white') || className?.includes('glass-input') || props.style?.color === '#ffffff';
    
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-transparent bg-muted/20 px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-300",
          // Si tiene texto blanco o es glass-input, no aplicar bg-background en focus
          hasWhiteText ? "" : "focus-visible:bg-background",
          className
        )}
        style={{
          ...(props.style || {}),
          ...(hasWhiteText ? { color: '#ffffff' } : {})
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
