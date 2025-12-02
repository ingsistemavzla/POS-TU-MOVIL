import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Search, X, CheckCircle, AlertCircle, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  id_number?: string;
}

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
}

export default function CustomerSelector({ selectedCustomer, onCustomerSelect }: CustomerSelectorProps) {
  const { userProfile } = useAuth();
  const [idSearchTerm, setIdSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'found' | 'not-found'>('idle');
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    id_number: ""
  });

  const handleSearch = async (searchValue?: string) => {
    const valueToSearch = searchValue ?? idSearchTerm.trim();
    if (!valueToSearch || !userProfile?.company_id) {
      setSearchStatus('idle');
      setCustomerNotFound(false);
      setShowRegistrationForm(false);
      return;
    }
    
    setIsSearching(true);
    setSearchStatus('idle');
    setCustomerNotFound(false);
    setShowRegistrationForm(false);
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id,name,email,phone,address,id_number')
        .eq('company_id', userProfile.company_id)
        .eq('id_number', valueToSearch)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error searching customer:', error);
        setIsSearching(false);
        return;
      }

      if (data) {
        // Cliente encontrado - seleccionar automáticamente
        onCustomerSelect(data as Customer);
        setSearchStatus('found');
        setCustomerNotFound(false);
        setShowRegistrationForm(false);
      } else {
        // Cliente NO encontrado - mostrar formulario de registro inline
        setSearchStatus('not-found');
        setCustomerNotFound(true);
        setNewCustomer({ 
          name: "", 
          email: "", 
          phone: "", 
          address: "", 
          id_number: valueToSearch 
        });
        setShowRegistrationForm(true);
      }
    } catch (err) {
      console.error('Customer search error:', err);
      setSearchStatus('idle');
    } finally {
      setIsSearching(false);
    }
  };

  // Búsqueda automática con debounce al escribir
  useEffect(() => {
    if (selectedCustomer) {
      setSearchStatus('found');
      setCustomerNotFound(false);
      setShowRegistrationForm(false);
      setIdSearchTerm(selectedCustomer.id_number || '');
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (idSearchTerm.trim().length >= 3 && userProfile?.company_id) {
      debounceRef.current = window.setTimeout(() => {
        handleSearch();
      }, 500);
    } else if (idSearchTerm.trim().length === 0) {
      setSearchStatus('idle');
      setCustomerNotFound(false);
      setShowRegistrationForm(false);
    }

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSearchTerm, selectedCustomer]);

  // Limpiar estado cuando se deselecciona cliente
  useEffect(() => {
    if (!selectedCustomer) {
      setIdSearchTerm("");
      setSearchStatus('idle');
      setCustomerNotFound(false);
      setShowRegistrationForm(false);
    }
  }, [selectedCustomer]);

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim() || !userProfile?.company_id) return;
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...newCustomer, company_id: userProfile.company_id }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Cliente creado - seleccionar automáticamente
        onCustomerSelect(data as Customer);
        setNewCustomer({ name: "", email: "", phone: "", address: "", id_number: "" });
        setIdSearchTerm(data.id_number || "");
        setSearchStatus('found');
        setCustomerNotFound(false);
        setShowRegistrationForm(false);
      }
    } catch (err) {
      console.error('Error creating customer:', err);
      alert('Error al crear el cliente.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Identificación del Cliente</h3>
      </div>

      {/* Si ya hay cliente seleccionado - Mostrar datos */}
      {selectedCustomer ? (
        <Card className="p-4 bg-accent-hover/10 border-accent-primary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <p className="font-semibold text-main-text">{selectedCustomer.name}</p>
                <p className="text-sm text-accent-primary">Cédula: {selectedCustomer.id_number}</p>
              </div>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              className="w-8 h-8 rounded-full hover:bg-status-danger/10" 
              onClick={() => onCustomerSelect(null)}
            >
              <X className="w-4 h-4 text-status-danger" />
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Input de búsqueda de cédula */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Ingresa la Cédula o RIF del cliente..."
              value={idSearchTerm}
              onChange={(e) => setIdSearchTerm(e.target.value)}
              onBlur={() => {
                if (idSearchTerm.trim().length >= 3) {
                  handleSearch();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && idSearchTerm.trim().length >= 3) {
                  handleSearch();
                }
              }}
              disabled={isSearching}
              className={`pl-10 h-12 text-lg ${
                searchStatus === 'found' 
                  ? 'border-green-500 shadow-md shadow-green-500/30' 
                  : searchStatus === 'not-found'
                  ? 'border-amber-500 shadow-md shadow-amber-500/30'
                  : ''
              }`}
              autoFocus
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Mensaje de estado de búsqueda */}
          {isSearching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Buscando cliente...</span>
            </div>
          )}

          {/* Formulario de registro INLINE (cuando cliente no existe) */}
          {showRegistrationForm && customerNotFound && !isSearching && (
            <Card className="p-4 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 animate-in slide-in-from-top duration-300">
              <div className="space-y-4">
                {/* Header del formulario */}
                <div className="flex items-center gap-2 pb-2 border-b border-amber-500/20">
                  <UserPlus className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-700 dark:text-amber-400">Cliente no registrado</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500">Completa los datos para registrarlo</p>
                  </div>
                </div>

                {/* Cédula (solo lectura) */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cédula / RIF</Label>
                  <Input 
                    value={newCustomer.id_number} 
                    disabled 
                    className="font-mono bg-muted/50 h-10" 
                  />
                </div>

                {/* Nombre (requerido) */}
                <div className="space-y-1">
                  <Label className="text-xs">Nombre Completo *</Label>
                  <Input 
                    placeholder="Ej: Juan Pérez" 
                    value={newCustomer.name} 
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} 
                    className="h-10"
                    autoFocus
                  />
                </div>

                {/* Teléfono y Email en una fila */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Teléfono (opcional)</Label>
                    <Input 
                      placeholder="04XX-XXXXXXX" 
                      value={newCustomer.phone} 
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} 
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Email (opcional)</Label>
                    <Input 
                      type="email" 
                      placeholder="correo@ejemplo.com" 
                      value={newCustomer.email} 
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} 
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Botón de registro */}
                <Button 
                  onClick={handleCreateCustomer} 
                  disabled={!newCustomer.name.trim() || isCreating} 
                  className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Registrar Cliente
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Hint cuando no hay búsqueda */}
          {searchStatus === 'idle' && idSearchTerm.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Ingresa al menos 3 caracteres para buscar
            </p>
          )}
        </div>
      )}
    </div>
  );
}
