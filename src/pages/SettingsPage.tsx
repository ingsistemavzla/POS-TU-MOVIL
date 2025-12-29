import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import {
  Settings,
  RefreshCw,
  Shield,
  Bell,
  Palette,
  Database,
  Receipt,
  Calculator,
  Info,
  AlertCircle,
  Lock,
  Building2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const { userProfile } = useAuth();
  const { settings, loading } = useSystemSettings();
  
  const [localSettings, setLocalSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

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
    <div className="min-h-screen">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center text-white">
              <Settings className="w-8 h-8 mr-3" />
              Configuración del Sistema
            </h1>
            <p className="text-muted-foreground mt-2">
              Visualiza las configuraciones generales de tu empresa
            </p>
          </div>
        </div>

      {/* Alerta informativa sobre contacto con soporte */}
      <Alert className="border-green-500/60 bg-green-500/20 shadow-lg shadow-green-500/20">
        <AlertCircle className="h-5 w-5 text-green-400" />
        <AlertTitle className="flex items-center gap-2 text-green-300">
          <Lock className="h-4 w-4" />
          Configuración de Solo Lectura
        </AlertTitle>
        <AlertDescription className="mt-2 text-green-200">
          Esta sección muestra la configuración actual del sistema de forma informativa. 
          Para modificar cualquier ajuste global, contacte a soporte técnico, con el fin de resguardar y proteger la integridad de los datos. Los primeros 30 días de prueba en servidor.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración Fiscal */}
        <Card className="glass-panel border border-white/10" style={{
          background: 'rgba(9, 9, 9, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Receipt className="w-5 h-5 mr-2 text-blue-400" />
              Configuración Fiscal
            </CardTitle>
            <CardDescription className="text-white/70">
              Configura los impuestos y aspectos fiscales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax_rate" className="flex items-center text-white/90">
                <Calculator className="w-4 h-4 mr-2 text-blue-300" />
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
                  disabled
                  readOnly
                  className="w-32 opacity-60 cursor-not-allowed"
                />
                <Badge variant="outline">%</Badge>
              </div>
              <p className="text-xs text-white/60">
                Porcentaje de IVA aplicado a las ventas
              </p>
            </div>

            <Separator />

                         <div className="space-y-2">
               <Label htmlFor="currency" className="text-white/90">Moneda Principal</Label>
               <Select
                 value={localSettings?.currency || 'USD'}
                 disabled
               >
                 <SelectTrigger className="opacity-60 cursor-not-allowed">
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
        <Card className="glass-panel border border-white/10" style={{
          background: 'rgba(9, 9, 9, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Building2 className="w-5 h-5 mr-2 text-blue-400" />
              Configuración de Empresa
            </CardTitle>
            <CardDescription className="text-white/70">
              Configura la información de tu empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt_footer" className="text-white/90">Pie de Factura</Label>
              <Textarea
                id="receipt_footer"
                value={localSettings?.receipt_footer || ''}
                disabled
                readOnly
                placeholder="Mensaje que aparece al final de las facturas"
                rows={4}
                className="resize-none opacity-60 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode_prefix" className="text-white/90">Prefijo de Códigos de Barras</Label>
              <Input
                id="barcode_prefix"
                value={localSettings?.barcode_prefix || ''}
                disabled
                readOnly
                placeholder="Prefijo para códigos de barras generados"
                className="opacity-60 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="low_stock_threshold" className="text-white/90">Umbral de Stock Bajo</Label>
              <Input
                id="low_stock_threshold"
                type="number"
                min="0"
                value={localSettings?.low_stock_threshold || 0}
                disabled
                readOnly
                placeholder="Cantidad mínima para alertas de stock"
                className="opacity-60 cursor-not-allowed"
              />
            </div>
          </CardContent>
        </Card>

        {/* Configuración Regional */}
        <Card className="glass-panel border border-white/10" style={{
          background: 'rgba(9, 9, 9, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Palette className="w-5 h-5 mr-2 text-blue-400" />
              Configuración Regional
            </CardTitle>
            <CardDescription className="text-white/70">
              Configura el idioma y zona horaria
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
                         <div className="space-y-2">
               <Label htmlFor="language" className="text-white/90">Idioma</Label>
               <Select
                 value={localSettings?.language || 'es'}
                 disabled
               >
                 <SelectTrigger className="opacity-60 cursor-not-allowed">
                   <SelectValue placeholder="Seleccionar idioma" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="es">Español</SelectItem>
                   <SelectItem value="en">English</SelectItem>
                 </SelectContent>
               </Select>
             </div>

                         <div className="space-y-2">
               <Label htmlFor="timezone" className="text-white/90">Zona Horaria</Label>
               <Select
                 value={localSettings?.timezone || 'America/Caracas'}
                 disabled
               >
                 <SelectTrigger className="opacity-60 cursor-not-allowed">
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
        <Card className="glass-panel border border-white/10" style={{
          background: 'rgba(9, 9, 9, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Shield className="w-5 h-5 mr-2 text-blue-400" />
              Configuración del Sistema
            </CardTitle>
            <CardDescription className="text-white/70">
              Configuraciones avanzadas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center text-white/90">
                  <Database className="w-4 h-4 mr-2 text-blue-300" />
                  Respaldo Automático
                </Label>
                <p className="text-xs text-white/60">
                  Realizar respaldos automáticos de la base de datos
                </p>
              </div>
              <Switch
                checked={localSettings?.auto_backup || false}
                disabled
                className="opacity-60"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center text-white/90">
                  <Bell className="w-4 h-4 mr-2 text-blue-300" />
                  Notificaciones
                </Label>
                <p className="text-xs text-white/60">
                  Habilitar notificaciones del sistema
                </p>
              </div>
              <Switch
                checked={localSettings?.notifications_enabled || false}
                disabled
                className="opacity-60"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información del Sistema */}
      <Card className="glass-panel border border-white/10" style={{
        background: 'rgba(9, 9, 9, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}>
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Info className="w-5 h-5 mr-2 text-blue-400" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-white/90">Empresa ID:</span>
              <p className="text-white/70">{userProfile?.company_id}</p>
            </div>
            <div>
              <span className="font-medium text-white/90">Usuario:</span>
              <p className="text-white/70">{userProfile?.email}</p>
            </div>
            <div>
              <span className="font-medium text-white/90">Última Actualización:</span>
              <p className="text-white/70">
                {localSettings?.updated_at ? new Date(localSettings.updated_at).toLocaleString('es-VE') : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
