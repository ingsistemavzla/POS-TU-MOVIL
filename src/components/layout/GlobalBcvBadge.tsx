import { useMemo, useState } from "react";
import { RefreshCw, Edit3, Check, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useBcv } from "@/contexts/BcvContext";

const sourceLabel: Record<string, string> = {
  manual: "Manual",
  api: "API",
  database: "Respaldo",
  fallback: "Fallback",
};

export function GlobalBcvBadge() {
  const { toast } = useToast();
  const { rate, source, refreshing, error, canManageBcv, refreshRate, setManualRate } = useBcv();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const currentDisplayRate = useMemo(() => Number(rate || 0).toFixed(2), [rate]);

  const startEdit = () => {
    if (!canManageBcv) return;
    setInputValue(currentDisplayRate);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setInputValue("");
  };

  const saveEdit = async () => {
    const parsed = Number.parseFloat(inputValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast({
        title: "BCV inválido",
        description: "Ingresa una tasa BCV mayor a 0.",
        variant: "destructive",
      });
      return;
    }

    const ok = await setManualRate(parsed);
    if (!ok) {
      toast({
        title: "No se pudo actualizar BCV",
        description: "Verifica permisos y conexión.",
        variant: "destructive",
      });
      return;
    }

    setEditing(false);
    toast({
      title: "BCV actualizado",
      description: `Nueva tasa global: Bs ${parsed.toFixed(2)}`,
      variant: "success",
    });
  };

  const handleRefresh = async () => {
    await refreshRate();
    if (error || source === "fallback") {
      toast({
        title: "Error al refrescar BCV",
        description: "No se pudo consultar la API BCV. Verifica conexión o actualiza manualmente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "BCV refrescado",
      description: `Tasa actual: Bs ${Number(rate || 0).toFixed(2)} (${sourceLabel[source] || source})`,
      variant: "success",
    });
  };

  return (
    <div className="flex items-center gap-1 xs:gap-2 px-2 py-1 rounded-md bg-white/10 border border-emerald-400/30">
      <Badge variant="secondary" className="bg-emerald-600/25 text-emerald-200 border border-emerald-500/40 text-[10px] px-1.5 py-0.5">
        BCV
      </Badge>

      {editing ? (
        <>
          <Input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="h-7 w-20 text-xs bg-white/10 border-white/20 text-white"
            step="0.01"
            min="0.01"
          />
          <Button size="icon" variant="ghost" onClick={saveEdit} className="h-7 w-7 text-emerald-300 hover:bg-white/10">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-7 w-7 text-red-300 hover:bg-white/10">
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <>
          <span className="text-xs font-semibold text-emerald-200 whitespace-nowrap">Bs {currentDisplayRate}</span>
          {source !== "api" ? (
            <span className="text-[10px] text-white/70 hidden sm:inline">({sourceLabel[source] || source})</span>
          ) : null}
          {error ? <AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> : null}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRefresh}
            disabled={refreshing || !canManageBcv}
            className="h-7 w-7 text-white/80 hover:bg-white/10 disabled:opacity-40"
            title="Refrescar tasa BCV"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          {canManageBcv ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={startEdit}
              className="h-7 w-7 text-white/80 hover:bg-white/10"
              title="Editar BCV manual"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
