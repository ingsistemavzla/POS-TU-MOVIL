import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertTriangle,
  Trash2,
  Receipt,
  User,
  Package
} from "lucide-react";

interface ConfirmDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  saleData?: {
    id: string;
    invoice_number?: string;
    customer_name?: string;
    items_count?: number;
  };
  loading?: boolean;
}

export function ConfirmDeleteModal({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  saleData,
  loading = false
}: ConfirmDeleteModalProps) {



  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Eliminación de Venta
          </DialogTitle>
          <DialogDescription>
            Esta acción eliminará permanentemente la venta y repondrá todo el inventario. 
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {saleData ? (
          <Card className="border border-border bg-card">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Información Básica */}
                <div className="space-y-3">
                  {/* Número de Factura */}
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Factura:</span>
                    <Badge variant="outline" className="text-xs">
                      {saleData.invoice_number || saleData.id.slice(0, 8)}
                    </Badge>
                  </div>

                  {/* Cliente */}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Cliente:</span>
                    <span className="text-sm text-muted-foreground">
                      {saleData.customer_name || 'Cliente General'}
                    </span>
                  </div>

                  {/* Productos a reponer */}
                  {saleData.items_count && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Productos a reponer:</span>
                      <Badge variant="secondary" className="text-xs">
                        {saleData.items_count} productos
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-green-500 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Información de venta no disponible
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Los datos de la venta se cargarán al confirmar la eliminación.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advertencia */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="font-semibold text-yellow-800">Advertencia Importante</p>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>• Esta acción eliminará permanentemente la venta del sistema</p>
                <p>• Se repondrá automáticamente el inventario de todos los productos vendidos</p>
                <p>• Esta acción es <strong>irreversible</strong> y no se puede deshacer</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Eliminar Venta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
