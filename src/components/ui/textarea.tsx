import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    const hasWhiteText = className?.includes('!text-white') || className?.includes('text-white') || className?.includes('glass-input') || props.style?.color === '#ffffff';
    const isGlassInput = className?.includes('glass-input') || hasWhiteText;
    
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300",
          // Si es glass-input explícito o tiene texto blanco, usar estilos oscuros con texto blanco
          // Nota: Los textareas dentro de .glass-panel/.glass-card se manejan automáticamente con CSS
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
Textarea.displayName = "Textarea"

export { Textarea }
