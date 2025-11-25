import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface SystemSettings {
  id: string;
  company_id: string;
  tax_rate: number;
  currency: string;
  timezone: string;
  language: string;
  auto_backup: boolean;
  notifications_enabled: boolean;
  receipt_footer: string;
  barcode_prefix: string;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export function useSystemSettings() {
  const { userProfile } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    if (!userProfile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // Create default settings if none exist
        await createDefaultSettings();
      }
    } catch (err) {
      console.error('Error fetching system settings:', err);
      setError('No se pudieron cargar las configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!userProfile?.company_id) return;

    try {
      const defaultSettings = {
        company_id: userProfile.company_id,
        tax_rate: 16, // Default IVA rate is 16%
        currency: 'USD',
        timezone: 'America/Caracas',
        language: 'es',
        auto_backup: true,
        notifications_enabled: true,
        receipt_footer: 'Gracias por su compra',
        barcode_prefix: 'POS',
        low_stock_threshold: 10,
      };

      const { data, error } = await supabase
        .from('system_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (err) {
      console.error('Error creating default settings:', err);
      setError('No se pudieron crear las configuraciones por defecto');
    }
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    if (!userProfile?.company_id || !settings) return false;

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          ...settings,
          ...newSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update local state
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      return true;
    } catch (err) {
      console.error('Error updating system settings:', err);
      setError('No se pudieron actualizar las configuraciones');
      return false;
    }
  };

  const getTaxRate = () => {
    const rate = settings?.tax_rate ?? 16; // Default IVA rate is 16% (but allow 0)
    console.log('getTaxRate Debug:', {
      settings: settings,
      tax_rate: settings?.tax_rate,
      rate: rate,
      isZero: rate === 0,
      type: typeof rate
    });
    return rate;
  };

  const getCurrency = () => {
    return settings?.currency || 'USD';
  };

  const getReceiptFooter = () => {
    return settings?.receipt_footer || 'Gracias por su compra';
  };

  const getBarcodePrefix = () => {
    return settings?.barcode_prefix || 'POS';
  };

  const getLowStockThreshold = () => {
    return settings?.low_stock_threshold || 10;
  };

  useEffect(() => {
    fetchSettings();
  }, [userProfile?.company_id]);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
    getTaxRate,
    getCurrency,
    getReceiptFooter,
    getBarcodePrefix,
    getLowStockThreshold,
  };
}
