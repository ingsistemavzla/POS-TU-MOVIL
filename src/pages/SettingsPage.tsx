import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import {
  Settings,
  Save,
  RefreshCw,
  DollarSign,
  Building2,
  User,
  Shield,
  Bell,
  Palette,
  Database,
  Wifi,
  CreditCard,
  Receipt,
  Calculator,
  Info,
} from 'lucide-react';

interface SystemSettings {
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

export default function SettingsPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const { settings, loading, error, updateSettings } = useSystemSettings();
  
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

    const handleSave = async () => {
    if (!localSettings) return;

    setSaving(true);
    try {
      const success = await updateSettings(localSettings);
      
      if (success) {
        toast({
          title: "Configuración guardada",
          description: `Los cambios se han guardado correctamente. El IVA ahora es ${localSettings.tax_rate}% y se aplicará inmediatamente en el POS.`,
        });
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las configuraciones",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setLocalSettings(settings);
      toast({
        title: "Configuración restaurada",
        description: "Se han restaurado los valores originales",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">Cargando configuraciones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Settings className="w-8 h-8 mr-3" />
            Configuración del Sistema
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona las configuraciones generales de tu empresa
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Restaurar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración Fiscal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="w-5 h-5 mr-2" />
              Configuración Fiscal
            </CardTitle>
            <CardDescription>
              Configura los impuestos y aspectos fiscales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax_rate" className="flex items-center">
                <Calculator className="w-4 h-4 mr-2" />
                Porcentaje de IVA (%)
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={localSettings?.tax_rate ?? 0}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = value === '' ? 0 : parseFloat(value);
                    if (!isNaN(numValue)) {
                      setLocalSettings(localSettings ? {
                        ...localSettings,
                        tax_rate: numValue
                      } : null);
                    }
                  }}
                  className="w-32"
                />
                <Badge variant="outline">%</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Porcentaje de IVA aplicado a las ventas
              </p>
            </div>

            <Separator />

                         <div className="space-y-2">
               <Label htmlFor="currency">Moneda Principal</Label>
               <Select
                 value={localSettings?.currency || 'USD'}
                 onValueChange={(value) => setLocalSettings(localSettings ? {
                   ...localSettings,
                   currency: value
                 } : null)}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Seleccionar moneda" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                   <SelectItem value="VES">VES - Bolívar Venezolano</SelectItem>
                   <SelectItem value="EUR">EUR - Euro</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </CardContent>
        </Card>

        {/* Configuración de Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Configuración de Empresa
            </CardTitle>
            <CardDescription>
              Configura la información de tu empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt_footer">Pie de Factura</Label>
              <Textarea
                id="receipt_footer"
                value={localSettings?.receipt_footer || ''}
                onChange={(e) => setLocalSettings(localSettings ? {
                  ...localSettings,
                  receipt_footer: e.target.value
                } : null)}
                placeholder="Mensaje que aparece al final de las facturas"
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode_prefix">Prefijo de Códigos de Barras</Label>
              <Input
                id="barcode_prefix"
                value={localSettings?.barcode_prefix || ''}
                onChange={(e) => setLocalSettings(localSettings ? {
                  ...localSettings,
                  barcode_prefix: e.target.value
                } : null)}
                placeholder="Prefijo para códigos de barras generados"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="low_stock_threshold">Umbral de Stock Bajo</Label>
              <Input
                id="low_stock_threshold"
                type="number"
                min="0"
                value={localSettings?.low_stock_threshold || 0}
                onChange={(e) => setLocalSettings(localSettings ? {
                  ...localSettings,
                  low_stock_threshold: parseInt(e.target.value) || 0
                } : null)}
                placeholder="Cantidad mínima para alertas de stock"
              />
            </div>
          </CardContent>
        </Card>

        {/* Configuración Regional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Configuración Regional
            </CardTitle>
            <CardDescription>
              Configura el idioma y zona horaria
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
                         <div className="space-y-2">
               <Label htmlFor="language">Idioma</Label>
               <Select
                 value={localSettings?.language || 'es'}
                 onValueChange={(value) => setLocalSettings(localSettings ? {
                   ...localSettings,
                   language: value
                 } : null)}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Seleccionar idioma" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="es">Español</SelectItem>
                   <SelectItem value="en">English</SelectItem>
                 </SelectContent>
               </Select>
             </div>

                         <div className="space-y-2">
               <Label htmlFor="timezone">Zona Horaria</Label>
               <Select
                 value={localSettings?.timezone || 'America/Caracas'}
                 onValueChange={(value) => setLocalSettings(localSettings ? {
                   ...localSettings,
                   timezone: value
                 } : null)}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Seleccionar zona horaria" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="America/Caracas">Caracas (UTC-4)</SelectItem>
                   <SelectItem value="America/New_York">Nueva York (UTC-5)</SelectItem>
                   <SelectItem value="America/Los_Angeles">Los Ángeles (UTC-8)</SelectItem>
                   <SelectItem value="Europe/Madrid">Madrid (UTC+1)</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </CardContent>
        </Card>

        {/* Configuración del Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Configuración del Sistema
            </CardTitle>
            <CardDescription>
              Configuraciones avanzadas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center">
                  <Database className="w-4 h-4 mr-2" />
                  Respaldo Automático
                </Label>
                <p className="text-xs text-muted-foreground">
                  Realizar respaldos automáticos de la base de datos
                </p>
              </div>
              <Switch
                checked={localSettings?.auto_backup || false}
                onCheckedChange={(checked) => setLocalSettings(localSettings ? {
                  ...localSettings,
                  auto_backup: checked
                } : null)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center">
                  <Bell className="w-4 h-4 mr-2" />
                  Notificaciones
                </Label>
                <p className="text-xs text-muted-foreground">
                  Habilitar notificaciones del sistema
                </p>
              </div>
              <Switch
                checked={localSettings?.notifications_enabled || false}
                onCheckedChange={(checked) => setLocalSettings(localSettings ? {
                  ...localSettings,
                  notifications_enabled: checked
                } : null)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Empresa ID:</span>
              <p className="text-muted-foreground">{userProfile?.company_id}</p>
            </div>
            <div>
              <span className="font-medium">Usuario:</span>
              <p className="text-muted-foreground">{userProfile?.email}</p>
            </div>
            <div>
              <span className="font-medium">Última Actualización:</span>
                             <p className="text-muted-foreground">
                 {localSettings?.updated_at ? new Date(localSettings.updated_at).toLocaleString('es-VE') : 'N/A'}
               </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
