import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchBcvRateFromApi, fetchBcvRateFromDatabase, saveBcvRateToDatabase } from "@/utils/bcvRate";

type BcvSource = "manual" | "api" | "database" | "fallback";

interface BcvContextValue {
  rate: number;
  source: BcvSource;
  lastUpdatedAt: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  canManageBcv: boolean;
  refreshRate: () => Promise<void>;
  setManualRate: (rate: number) => Promise<boolean>;
}

const DEFAULT_BCV_RATE = 41.73;

const BcvContext = createContext<BcvContextValue | undefined>(undefined);

export function BcvProvider({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuth();
  const [rate, setRate] = useState<number>(DEFAULT_BCV_RATE);
  const [source, setSource] = useState<BcvSource>("fallback");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const companyId = userProfile?.company_id ?? null;
  const canManageBcv = userProfile?.role === "admin" || userProfile?.role === "manager" || userProfile?.role === "cashier";

  const loadCurrentManualRate = useCallback(async (): Promise<number | null> => {
    if (!companyId) return null;

    const { data, error: fetchError } = await supabase
      .from("system_settings")
      .select("manual_bcv_rate")
      .eq("company_id", companyId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error loading manual_bcv_rate:", fetchError);
      return null;
    }

    const manual = (data as any)?.manual_bcv_rate;
    return typeof manual === "number" && manual > 0 ? manual : null;
  }, [companyId]);

  const refreshRate = useCallback(async () => {
    if (!companyId || inFlightRef.current) return;
    inFlightRef.current = true;
    setRefreshing(true);
    setError(null);

    try {
      const apiRate = await fetchBcvRateFromApi();
      if (apiRate !== null) {
        setRate(apiRate);
        setSource("api");
        setLastUpdatedAt(new Date().toISOString());
        await saveBcvRateToDatabase(apiRate);
        return;
      }

      // Manual es secundario: solo se usa cuando API no responde.
      const manualRate = await loadCurrentManualRate();
      if (manualRate !== null) {
        setRate(manualRate);
        setSource("manual");
        setLastUpdatedAt(new Date().toISOString());
        setError("API BCV no disponible. Usando tasa manual de respaldo.");
        return;
      }

      const dbRate = await fetchBcvRateFromDatabase();
      if (dbRate !== null) {
        setRate(dbRate);
        setSource("database");
        setLastUpdatedAt(new Date().toISOString());
        setError("No se pudo consultar API BCV. Usando tasa guardada.");
        return;
      }

      setSource("fallback");
      setError("No se pudo actualizar la tasa BCV.");
    } catch (refreshError) {
      console.error("Error refreshing BCV rate:", refreshError);
      setError("No se pudo actualizar la tasa BCV.");
    } finally {
      setRefreshing(false);
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [companyId, loadCurrentManualRate]);

  const setManualRate = useCallback(async (nextRate: number): Promise<boolean> => {
    if (!companyId || !canManageBcv || !Number.isFinite(nextRate) || nextRate <= 0) return false;

    try {
      const { error: upsertError } = await supabase
        .from("system_settings")
        .upsert({
          company_id: companyId,
          manual_bcv_rate: nextRate,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "company_id" });

      if (upsertError) {
        console.error("Error saving manual_bcv_rate:", upsertError);
        return false;
      }

      setRate(nextRate);
      setSource("manual");
      setLastUpdatedAt(new Date().toISOString());
      setError(null);
      return true;
    } catch (saveError) {
      console.error("Error saving manual BCV rate:", saveError);
      return false;
    }
  }, [canManageBcv, companyId]);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    refreshRate();
  }, [companyId, refreshRate]);

  useEffect(() => {
    if (!companyId) return;

    const THIRTY_MIN_MS = 30 * 60 * 1000;
    const intervalId = window.setInterval(() => {
      refreshRate();
    }, THIRTY_MIN_MS);

    const onFocus = () => refreshRate();
    const onOnline = () => refreshRate();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshRate();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [companyId, refreshRate]);

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`bcv-settings-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_settings",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          refreshRate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, refreshRate]);

  const value = useMemo<BcvContextValue>(() => ({
    rate,
    source,
    lastUpdatedAt,
    loading,
    refreshing,
    error,
    canManageBcv,
    refreshRate,
    setManualRate,
  }), [canManageBcv, error, lastUpdatedAt, loading, rate, refreshing, refreshRate, setManualRate, source]);

  return <BcvContext.Provider value={value}>{children}</BcvContext.Provider>;
}

export function useBcv() {
  const context = useContext(BcvContext);
  if (!context) {
    throw new Error("useBcv must be used within BcvProvider");
  }
  return context;
}
