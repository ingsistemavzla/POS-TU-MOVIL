import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { User, Search, X } from "lucide-react";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    id_number: ""
  });

  const handleSearch = async () => {
    if (!idSearchTerm.trim() || !userProfile?.company_id) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id,name,email,phone,address,id_number')
        .eq('company_id', userProfile.company_id)
        .eq('id_number', idSearchTerm.trim())
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore 'single row not found' errors
        console.error('Error searching customer:', error);
        return;
      }

      if (data) {
        onCustomerSelect(data as Customer);
      } else {
        setNewCustomer({ ...newCustomer, id_number: idSearchTerm.trim() });
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Customer search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim() || !userProfile?.company_id) return;
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...newCustomer, company_id: userProfile.company_id }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        onCustomerSelect(data as Customer);
        setIsModalOpen(false);
        setNewCustomer({ name: "", email: "", phone: "", address: "", id_number: "" });
        setIdSearchTerm("");
      }
    } catch (err) {
      console.error('Error creating customer:', err);
      alert('Error al crear el cliente.');
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold">Cliente</h3>
      {selectedCustomer ? (
        <Card className="p-3 glass-card bg-primary/10 border-primary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedCustomer.name}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedCustomer.id_number}</p>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="w-6 h-6 rounded-full" onClick={() => onCustomerSelect(null)}><X className="w-4 h-4" /></Button>
          </div>
        </Card>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cédula o RIF..."
            value={idSearchTerm}
            onChange={(e) => setIdSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            disabled={isSearching}
            className="pl-8 h-9 glass-card"
          />
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md glass-card">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Cédula / RIF</Label>
            <Input value={newCustomer.id_number} disabled className="font-mono" />
            
            <Label htmlFor="name">Nombre Completo *</Label>
            <Input id="name" placeholder="Nombre del cliente" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} autoFocus />
            
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" placeholder="(Opcional)" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />

            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="(Opcional)" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />

            <Label htmlFor="address">Dirección</Label>
            <Input id="address" placeholder="(Opcional)" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} />

            <div className="flex gap-2 pt-3">
              <Button onClick={handleCreateCustomer} disabled={!newCustomer.name.trim()} className="flex-1 bg-primary glow-primary">Crear Cliente</Button>
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="hover-glow">Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}