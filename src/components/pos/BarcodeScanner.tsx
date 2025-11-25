import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Scan, Keyboard } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, isOpen, onClose }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setManualCode("");
      setIsListening(false);
      return;
    }

    let scanBuffer = "";
    let scanTimeout: NodeJS.Timeout;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Prevent default browser behavior
      event.preventDefault();
      
      if (event.key === "Enter") {
        if (scanBuffer.length > 0) {
          onScan(scanBuffer);
          scanBuffer = "";
          onClose();
        }
        return;
      }
      
      if (event.key === "Escape") {
        onClose();
        return;
      }

      // Add character to buffer
      if (event.key.length === 1) {
        scanBuffer += event.key;
        
        // Clear timeout and set new one
        clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => {
          scanBuffer = "";
        }, 100); // Clear buffer after 100ms of inactivity
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    setIsListening(true);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      clearTimeout(scanTimeout);
    };
  }, [isOpen, onScan, onClose]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Scan className="w-5 h-5" />
            <span>Escáner de Código</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Scanner Status */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center animate-pulse">
              <Scan className="w-8 h-8 text-white" />
            </div>
            <p className="text-sm text-muted-foreground">
              {isListening ? "Listo para escanear..." : "Iniciando escáner..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Escanea el código de barras del producto
            </p>
          </div>

          {/* Manual Input */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Keyboard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Ingreso manual</span>
            </div>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Código de barras..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualSubmit();
                  }
                }}
                className="glass-card"
                autoFocus
              />
              <Button 
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="bg-gradient-primary glow-primary"
              >
                OK
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-muted/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Instrucciones:</strong>
              <br />• Escanea directamente con el lector
              <br />• O ingresa el código manualmente
              <br />• Presiona ESC para cancelar
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}