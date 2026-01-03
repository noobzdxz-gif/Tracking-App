import * as React from "react"
import { cn } from "@/lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
        <button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                // BASE STYLES: Transparent background, White Border, White Text
                "bg-transparent border-2 border-white text-white hover:bg-white/20",
                className
            )}
            {...props}
        />
    )
})
Button.displayName = "Button"

export { Button }
