import { Switch } from "@/components/ui/switch"
import { AlertTriangle } from "lucide-react"

export function SwitchDemo() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Switch>
          <span>Low power mode</span>
        </Switch>
      </div>
      
      <div className="flex items-center gap-2">
        <Switch isSelected={true}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span>Solo Stock Bajo</span>
          </div>
        </Switch>
      </div>
    </div>
  )
}
