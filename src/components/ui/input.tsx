import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const hasWhiteText = className?.includes('!text-white') || className?.includes('text-white') || className?.includes('glass-input') || props.style?.color === '#ffffff';
    const isGlassInput = className?.includes('glass-input') || hasWhiteText;
    
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-300",
          // Si es glass-input explícito o tiene texto blanco, usar estilos oscuros con texto blanco
          // Nota: Los inputs dentro de .glass-panel/.glass-card se manejan automáticamente con CSS
          isGlassInput 
            ? "bg-[rgba(17,24,39,0.6)] border-[rgba(16,185,129,0.3)] text-white placeholder:text-white/50 focus-visible:bg-[rgba(17,24,39,0.8)] focus-visible:border-[rgba(16,185,129,0.5)]"
            : "bg-white/95 border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:bg-white focus-visible:border-primary/50 shadow-sm",
          className
        )}
        style={{
          ...(props.style || {}),
          // Forzar color blanco solo si es glass-input explícito
          ...(isGlassInput ? { color: '#ffffff' } : {})
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
