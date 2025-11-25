import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { getAuthRedirectUrl } from "@/config/environment";
import {
  Search,
  Plus,
  Users as UsersIcon,
  Shield,
  UserCheck,
  Filter,
  Mail,
  Phone,
  RefreshCw,
  X,
  Edit,
  Key,
  Trash2,
  UserX,
  CheckCircle,
  Store,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type UserRow = Tables<"users">;

const roles = [
  { key: "admin", name: "Administrador", color: "primary", icon: Shield },
  { key: "manager", name: "Gerente", color: "accent", icon: UserCheck },
  { key: "cashier", name: "Cajero", color: "secondary", icon: UsersIcon },
] as const;

export default function Users() {
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [allUsers, setAllUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState<"admin" | "manager" | "cashier">("cashier");
  const [createStoreId, setCreateStoreId] = useState<string>("");
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [createOpen, setCreateOpen] = useState(false);
  
  // Estados para edición de usuario
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "manager" | "cashier">("cashier");
  const [editStoreId, setEditStoreId] = useState<string>("");
  const [editActive, setEditActive] = useState(true);
  
  // Estados para restablecer contraseña
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRow | null>(null);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const companyId = userProfile?.company_id ?? null;

  // Separar usuarios por rol (incluyendo deshabilitados en la misma vista)
  // Ordenar para que usuarios deshabilitados aparezcan al final
  // Listas por rol SOLO de usuarios activos (para las tablas principales)
  const cashiers = useMemo(() => {
    const term = search.toLowerCase();
    return allUsers
      .filter(u => u.role === 'cashier' && u.active)
      .filter(u => 
        !search.trim() || 
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
  }, [allUsers, search]);

  const managers = useMemo(() => {
    const term = search.toLowerCase();
    return allUsers
      .filter(u => u.role === 'manager' && u.active)
      .filter(u => 
        !search.trim() || 
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
  }, [allUsers, search]);

  const admins = useMemo(() => {
    const term = search.toLowerCase();
    return allUsers
      .filter(u => u.role === 'admin' && u.active)
      .filter(u => 
        !search.trim() || 
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
  }, [allUsers, search]);

  // Lista unificada de usuarios deshabilitados (sin importar rol)
  const disabledUsers = useMemo(() => {
    const term = search.toLowerCase();
    return allUsers
      .filter(u => !u.active)
      .filter(u =>
        !search.trim() ||
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      )
      .sort((a, b) => {
        // Ordenar por rol y luego por nombre para mejor lectura
        if (a.role === b.role) {
          return (a.name || '').localeCompare(b.name || '');
        }
        return a.role.localeCompare(b.role);
      });
  }, [allUsers, search]);

  const stats = useMemo(() => {
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter((u) => u.active).length;
    const adminCount = allUsers.filter((u) => u.role === "admin" && u.active).length;
    const managerCount = allUsers.filter((u) => u.role === "manager" && u.active).length;
    return { totalUsers, activeUsers, adminCount, managerCount };
  }, [allUsers]);

  const getRoleBadge = (role: string) => {
    const roleConfig = roles.find((r) => r.key === role);
    if (!roleConfig) return null;
    const Icon = roleConfig.icon;
    return (
      <Badge className={`bg-${roleConfig.color}/20 text-${roleConfig.color} border-${roleConfig.color}/30`}>
        <Icon className="w-3 h-3 mr-1" />
        {roleConfig.name}
      </Badge>
    );
  };

  const fetchStores = async () => {
    if (!companyId) return;
    const { data, error } = await (supabase as any)
      .from("stores")
      .select("id,name,active")
      .eq("company_id", companyId)
      .eq("active", true)
      .order("name", { ascending: true });
    if (!error && data) {
      setStores(data.map((s: any) => ({ id: s.id, name: s.name })));
    }
  };


  const fetchUsers = async () => {
    if (!companyId) return;
    
    // Obtener todos los usuarios (activos y deshabilitados)
    const { data, error } = await (supabase as any)
      .from("users")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    
    if (error) {
      toast({ title: "Error cargando usuarios", description: error.message, variant: "destructive" });
    } else {
      const allUsersData = data as any[] || [];
      setAllUsers(allUsersData);
      // Separar activos para las estadísticas
      setUsers(allUsersData.filter(u => u.active));
    }
  };


  useEffect(() => {
    fetchUsers();
    fetchStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const createUser = async () => {
    if (!companyId) return;
    if (!createEmail) {
      toast({ title: "Correo requerido", description: "Ingrese un correo válido." });
      return;
    }
    if (!createPassword) {
      toast({ title: "Contraseña requerida", description: "Ingrese una contraseña." });
      return;
    }
    if (!createName) {
      toast({ title: "Nombre requerido", description: "Ingrese el nombre del usuario." });
      return;
    }
    // La tienda es opcional al crear - puede asignarse después desde el dashboard
    setLoading(true);
    try {
      console.log('Creating user with:', {
        company_id: companyId,
        email: createEmail,
        name: createName,
        role: createRole,
        assigned_store_id: createRole === "admin" ? null : createStoreId,
      });
      
      // First create the user profile
      const { data: profileData, error: profileError } = await (supabase as any).rpc('create_user_directly', {
        p_email: createEmail,
        p_password: createPassword,
        p_name: createName,
        p_role: createRole,
        p_company_id: companyId,
        p_assigned_store_id: createRole === "admin" ? null : createStoreId,
      });

      if (profileError) throw profileError;

      if (profileData && typeof profileData === 'object' && 'error' in profileData && profileData.error) {
        throw new Error((profileData as any).message || 'Error al crear usuario');
      }

      // Now create the auth user using Supabase's signUp method
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createEmail,
        password: createPassword,
        options: {
          data: {
            name: createName,
            role: createRole,
            company_id: companyId,
            assigned_store_id: createRole === "admin" ? null : createStoreId,
          }
        }
      });

      if (authError) {
        console.warn('Auth user creation failed:', authError);
        toast({ 
          title: "Perfil creado", 
          description: `Perfil de ${createName} creado. El usuario debe registrarse manualmente con este email.`,
          variant: "default"
        });
      } else {
        // Update the user profile with the correct auth_user_id
        if (authData.user) {
          const { error: updateError } = await (supabase as any)
            .from('users')
            .update({ auth_user_id: authData.user.id })
            .eq('email', createEmail);
          
          if (updateError) {
            console.warn('Failed to update user with auth_user_id:', updateError);
          }
        }
        
        toast({ 
          title: "Usuario creado", 
          description: `Usuario ${createName} creado exitosamente. Puede iniciar sesión inmediatamente con las credenciales proporcionadas.`
        });
      }
      
      // Reset form
      setCreateEmail("");
      setCreatePassword("");
      setCreateName("");
      setCreateStoreId("");
      setCreateRole("cashier");
      setCreateOpen(false);
      
      // Refresh users list
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "No se pudo crear usuario", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: UserRow) => {
    setEditUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditRole((user.role as "admin" | "manager" | "cashier") || "cashier");
    setEditStoreId(user.assigned_store_id || "");
    setEditActive(user.active ?? true);
    setNewPassword(""); // Limpiar contraseña al abrir
    setConfirmPassword(""); // Limpiar confirmación al abrir
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditUser(null);
    setEditName("");
    setEditEmail("");
    setEditRole("cashier");
    setEditStoreId("");
    setEditActive(true);
    setEditOpen(false);
  };

  const updateUser = async (): Promise<boolean> => {
    if (!editUser) {
      toast({ title: "Error", description: "No hay usuario seleccionado.", variant: "destructive" });
      return false;
    }
    
    if (!editName.trim()) {
      toast({ title: "Nombre requerido", description: "Ingrese el nombre del usuario.", variant: "destructive" });
      return false;
    }
    
    if (!editEmail.trim()) {
      toast({ title: "Email requerido", description: "Ingrese el email del usuario.", variant: "destructive" });
      return false;
    }
    
    if (editRole !== "admin" && !editStoreId) {
      toast({ title: "Tienda requerida", description: "Seleccione la tienda del usuario.", variant: "destructive" });
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .rpc('update_user_profile', {
          p_user_id: editUser.id,
          p_name: editName.trim(),
          p_email: editEmail.trim(),
          p_role: editRole,
          p_assigned_store_id: editRole === "admin" ? null : editStoreId,
          p_active: editActive
        });

      if (error) {
        throw error;
      }

      if (data && typeof data === 'object' && 'error' in data && data.error) {
        throw new Error((data as any).message || 'Error al actualizar usuario');
      }

      toast({ 
        title: "Usuario actualizado", 
        description: `El usuario ${editName} ha sido actualizado exitosamente.`
      });
      
      await fetchUsers();
      return true;
    } catch (e: any) {
      console.error('Update user error:', e);
      toast({ 
        title: "No se pudo actualizar usuario", 
        description: e?.message ?? String(e), 
        variant: "destructive" 
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const openResetPasswordModal = (user: UserRow) => {
    setResetPasswordUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setResetPasswordOpen(true);
  };

  const closeResetPasswordModal = () => {
    setResetPasswordUser(null);
    setNewPassword("");
    setConfirmPassword("");
    setResetPasswordOpen(false);
  };

  const resetPassword = async () => {
    // Puede usar resetPasswordUser o editUser
    const targetUser = resetPasswordUser || editUser;
    if (!targetUser) return;
    
    // Prevent admin from changing their own password
    if (userProfile?.id === targetUser.id) {
      toast({ 
        title: "No permitido", 
        description: "No puedes cambiar tu propia contraseña desde este módulo. Usa la opción de cambio de contraseña en tu perfil.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!newPassword || newPassword.length < 6) {
      toast({ 
        title: "Contraseña inválida", 
        description: "La contraseña debe tener al menos 6 caracteres.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({ 
        title: "Contraseñas no coinciden", 
        description: "Las contraseñas deben ser iguales.", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      // Call RPC function to reset password directly in database
      const { data: rpcData, error: rpcError } = await (supabase as any)
        .rpc('reset_user_password', {
          p_user_id: targetUser.id,
          p_new_password: newPassword
        });

      if (rpcError) {
        throw rpcError;
      }

      if (rpcData && typeof rpcData === 'object' && 'error' in rpcData && rpcData.error) {
        throw new Error((rpcData as any).message || 'Error al restablecer contraseña');
      }

      // Password has been updated directly in the database
      toast({ 
        title: "Contraseña restablecida", 
        description: `La contraseña de ${targetUser.name} ha sido restablecida exitosamente. La nueva contraseña es: ${newPassword}. Comparte esta información de forma segura con el usuario.`
      });

      closeResetPasswordModal();
    } catch (e: any) {
      console.error('Reset password error:', e);
      toast({ 
        title: "No se pudo restablecer contraseña", 
        description: e?.message ?? String(e), 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar sucursal rápidamente desde la tabla
  const updateStoreQuickly = async (userId: string, storeId: string | null) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('users')
        .update({ 
          assigned_store_id: storeId, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Sucursal actualizada",
        description: "La sucursal ha sido asignada exitosamente.",
      });

      await fetchUsers();
    } catch (e: any) {
      console.error('Update store error:', e);
      toast({
        title: "Error",
        description: e?.message ?? "No se pudo actualizar la sucursal",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para habilitar/deshabilitar usuario mediante Switch
  const toggleUserStatus = async (userId: string, userName: string, currentActive: boolean, userRole: string) => {
    const newActiveStatus = !currentActive;

    // Si se está deshabilitando, verificar que no sea el último admin activo
    if (!newActiveStatus && userRole === 'admin') {
      const adminCount = allUsers.filter(u => u.role === 'admin' && u.active).length;
      if (adminCount <= 1) {
        toast({ 
          title: "No se puede deshabilitar", 
          description: "No se puede deshabilitar el último administrador activo de la empresa.", 
          variant: "destructive" 
        });
        return;
      }
    }

    // Si se está deshabilitando, confirmar acción
    if (!newActiveStatus && !confirm(`¿Estás seguro de que quieres deshabilitar al usuario ${userName}? El usuario no podrá acceder al sistema, pero sus datos históricos se conservarán.`)) {
      return;
    }

    // Prevenir auto-deshabilitación
    if (!newActiveStatus && userProfile?.id === userId) {
      toast({
        title: "No se puede deshabilitar",
        description: "No puedes deshabilitarte a ti mismo.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Toggling user status:', { userId, userName, newActiveStatus, currentActive });

      // Actualizar estado activo del usuario
      const { data, error } = await (supabase as any)
        .from('users')
        .update({ 
          active: newActiveStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Toggle user status error:', error);
        throw error;
      }

      toast({ 
        title: newActiveStatus ? "Usuario habilitado" : "Usuario deshabilitado", 
        description: newActiveStatus 
          ? `El usuario ${userName} ha sido habilitado exitosamente. Ahora puede acceder al sistema.`
          : `El usuario ${userName} ha sido deshabilitado exitosamente. Ya no podrá acceder al sistema, pero sus datos históricos se conservarán.`
      });
      
      // Refresh users list
      await fetchUsers();
    } catch (e: any) {
      console.error('Toggle user status error:', e);
      toast({ 
        title: newActiveStatus ? "No se pudo habilitar usuario" : "No se pudo deshabilitar usuario", 
        description: e?.message ?? String(e), 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    // Verificar si es el último admin
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin' && u.active).length;
      if (adminCount <= 1) {
        toast({ 
          title: "No se puede deshabilitar", 
          description: "No se puede deshabilitar el último administrador activo de la empresa.", 
          variant: "destructive" 
        });
        return;
      }
    }

    if (!confirm(`¿Estás seguro de que quieres deshabilitar al usuario ${userName}? El usuario dejará de aparecer en la lista y no podrá acceder al sistema, pero sus datos históricos se conservarán.`)) {
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to disable user:', { userId, userName });
      
      // Prevent self-deletion
      if (userProfile?.id === userId) {
        throw new Error('No puedes deshabilitarte a ti mismo');
      }

      // Deshabilitar usuario (soft delete) estableciendo active = false
      // No necesitamos usar la función SQL, podemos hacerlo directamente
      const { data, error } = await (supabase as any)
        .from('users')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Disable user error:', error);
        throw error;
      }

      toast({ 
        title: "Usuario deshabilitado", 
        description: `El usuario ${userName} ha sido deshabilitado exitosamente. Ya no aparecerá en la lista y no podrá acceder al sistema, pero sus datos históricos se conservarán.`
      });
      
      // Refresh users list
      await fetchUsers();
    } catch (e: any) {
      console.error('Disable user error:', e);
      toast({ 
        title: "No se pudo deshabilitar usuario", 
        description: e?.message ?? String(e), 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Badge de versión */}
      <div className="absolute top-0 right-0 z-10">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          v-valid
        </Badge>
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Crea, administra y elimina usuarios del sistema</p>
        </div>
      </div>

      {/* Stats Overview - 4 columnas en PC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 glass-card hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Usuarios</p>
              <p className="text-2xl font-bold animate-counter">{stats.totalUsers}</p>
            </div>
            <UsersIcon className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6 glass-card hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Usuarios Activos</p>
              <p className="text-2xl font-bold text-success animate-counter">{stats.activeUsers}</p>
            </div>
            <UserCheck className="w-8 h-8 text-success" />
          </div>
        </Card>

        <Card className="p-6 glass-card hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Administradores</p>
              <p className="text-2xl font-bold animate-counter">{stats.adminCount}</p>
            </div>
            <Shield className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6 glass-card hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gerentes</p>
              <p className="text-2xl font-bold animate-counter">{stats.managerCount}</p>
            </div>
            <UserCheck className="w-8 h-8 text-accent" />
          </div>
        </Card>
      </div>

      {/* Search & Invite */}
      <Card className="p-4 glass-card">
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar usuarios..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 glass-card border-primary/20 focus:border-primary focus:glow-primary"
              />
            </div>
            <Button variant="outline" className="hover-glow" onClick={() => { fetchUsers(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="btn-premium bg-primary glow-primary">
                  <Plus className="w-4 h-4 mr-2" /> Crear Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Usuario</DialogTitle>
                  <DialogDescription>Crea un nuevo usuario con email, contraseña y rol asignado. El usuario podrá iniciar sesión inmediatamente.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre completo</Label>
                    <Input 
                      type="text" 
                      placeholder="Nombre del usuario" 
                      value={createName} 
                      onChange={(e) => setCreateName(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Correo electrónico</Label>
                    <Input 
                      type="email" 
                      placeholder="correo@dominio.com" 
                      value={createEmail} 
                      onChange={(e) => setCreateEmail(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contraseña</Label>
                    <Input 
                      type="password" 
                      placeholder="Contraseña del usuario" 
                      value={createPassword} 
                      onChange={(e) => setCreatePassword(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <select
                      className="w-full bg-background border rounded-md px-3 py-2"
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as any)}
                    >
                      {roles.map((r) => (
                        <option key={r.key} value={r.key}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  {createRole !== 'admin' && (
                    <div className="space-y-2">
                      <Label>Tienda asignada (opcional)</Label>
                      <select
                        className="w-full bg-background border rounded-md px-3 py-2"
                        value={createStoreId}
                        onChange={(e) => setCreateStoreId(e.target.value)}
                      >
                        <option value="">Sin asignar - Asignar después</option>
                        {stores.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Puede asignarse ahora o después desde el dashboard. El cajero solo podrá operar cuando tenga una tienda asignada.
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button disabled={loading} onClick={createUser}>Crear Usuario</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

        </div>
      </Card>

      {/* Users Tables - Separated by Role */}
      <div className="space-y-6">
        {/* Tabla de Cajeros */}
        <Card className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-primary/5">
            <div className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Cajeros</h3>
              <Badge variant="secondary" className="ml-2">{cashiers.length}</Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 font-semibold">Usuario</th>
                  <th className="text-left p-4 font-semibold">Nivel Usuario</th>
                  <th className="text-left p-4 font-semibold">Sucursal</th>
                  <th className="text-left p-4 font-semibold">Estado</th>
                  <th className="text-left p-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cashiers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No hay cajeros registrados
                    </td>
                  </tr>
                ) : (
                  cashiers.map((user, index) => {
                    const isDisabled = !user.active;
                    const assignedStore = stores.find(s => s.id === user.assigned_store_id);
                    return (
                      <tr
                        key={user.id}
                        className={`border-b border-border/30 transition-all animate-fade-in hover:bg-muted/30`}
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <td className={`p-4 ${isDisabled ? 'opacity-50 grayscale' : ''}`}>
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${isDisabled ? 'bg-muted/50 text-muted-foreground' : 'bg-primary/20 glow-primary text-primary'}`}>
                              {user.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-medium ${isDisabled ? 'text-muted-foreground' : ''}`}>{user.name}</p>
                              <p className="text-sm text-muted-foreground">Correo: {user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`p-4 ${isDisabled ? 'opacity-50 grayscale' : ''}`}>{getRoleBadge(user.role)}</td>
                        <td className={`p-4 ${isDisabled ? 'opacity-50 grayscale' : ''}`}>
                          {user.role === 'cashier' ? (
                            <Select
                              value={user.assigned_store_id || ''}
                              onValueChange={(value) => updateStoreQuickly(user.id, value || null)}
                              disabled={loading || isDisabled}
                            >
                              <SelectTrigger className="w-[200px] bg-green-500 hover:bg-green-600 text-black border-green-600 font-medium">
                                <SelectValue placeholder="Seleccionar sucursal">
                                  {assignedStore?.name || 'Sin asignar'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {stores.map((store) => (
                                  <SelectItem key={store.id} value={store.id}>
                                    {store.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          {/* Switch sin opacidad - siempre accesible */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                isSelected={!!user.active}
                                onSelectionChange={(isSelected) => {
                                  if (isSelected !== !!user.active) {
                                    toggleUserStatus(user.id, user.name || 'Usuario', !!user.active, user.role);
                                  }
                                }}
                                isDisabled={loading || (user.role === 'admin' && allUsers.filter(u => u.role === 'admin' && u.active).length <= 1 && user.active)}
                                className={`
                                  ${user.active 
                                    ? '[&>div>div:first-child]:data-[selected]:bg-green-600 [&>div>div:first-child]:data-[selected]:border-green-700 [&>div>div:first-child]:bg-input' 
                                    : '[&>div>div:first-child]:bg-red-600 [&>div>div:first-child]:data-[selected]:bg-red-600 [&>div>div:first-child]:data-[selected]:border-red-700'}
                                  [&>div>div:first-child]:opacity-100
                                  [&>div>div:first-child]:data-[disabled]:opacity-100
                                `}
                              >
                                <span className={`text-sm font-medium ml-2 ${user.active ? 'text-green-600' : 'text-red-600'}`}>
                                  {user.active ? 'Habilitado' : 'Deshabilitado'}
                                </span>
                              </Switch>
                            </div>
                          </div>
                        </td>
                        <td className={`p-4 ${isDisabled ? 'opacity-50 grayscale' : ''}`}>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="bg-gray-900 hover:bg-gray-800 text-green-500 hover:text-green-400 font-medium"
                              onClick={() => openEditModal(user)}
                              disabled={loading || isDisabled}
                              title="Modificar usuario"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Modificar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Tabla de Gerentes */}
        <Card className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-accent/5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-lg">Gerentes</h3>
              <Badge variant="secondary" className="ml-2">{managers.length}</Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 font-semibold">Usuario</th>
                  <th className="text-left p-4 font-semibold">Nivel Usuario</th>
                  <th className="text-left p-4 font-semibold">Sucursal</th>
                  <th className="text-left p-4 font-semibold">Estado</th>
                  <th className="text-left p-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {managers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No hay gerentes registrados
                    </td>
                  </tr>
                ) : (
                  managers.map((user, index) => {
                    const isDisabled = !user.active;
                    const assignedStore = stores.find(s => s.id === user.assigned_store_id);
                    return (
                      <tr
                        key={user.id}
                        className={`border-b border-border/30 transition-all animate-fade-in hover:bg-muted/30`}
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <td className={`p-4 ${isDisabled ? 'opacity-50 grayscale' : ''}`}>
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${isDisabled ? 'bg-muted/50 text-muted-foreground' : 'bg-accent/20 text-accent'}`}>
                              {user.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-medium ${isDisabled ? 'text-muted-foreground' : ''}`}>{user.name}</p>
                              <p className="text-sm text-muted-foreground">Correo: {user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`p-4 ${isDisabled ? 'opacity-50 grayscale' : ''}`}>{getRoleBadge(user.role)}</td>
                        <td className={`p-4 ${isDisabled ? 'opacity-50 grayscale' : ''}`}>
                          {user.role === 'manager' ? (
                            <Select
                              value={user.assigned_store_id || ''}
                              onValueChange={(value) => updateStoreQuickly(user.id, value || null)}
                              disabled={loading || isDisabled}
                            >
                              <SelectTrigger className="w-[200px] bg-green-500 hover:bg-green-600 text-black border-green-600 font-medium">
                                <SelectValue placeholder="Seleccionar sucursal">
                                  {assignedStore?.name || 'Sin asignar'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {stores.map((store) => (
                                  <SelectItem key={store.id} value={store.id}>
                                    {store.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          {/* Switch sin opacidad - siempre accesible */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                isSelected={!!user.active}
                                onSelectionChange={(isSelected) => {
                                  if (isSelected !== !!user.active) {
                                    toggleUserStatus(user.id, user.name || 'Usuario', !!user.active, user.role);
                                  }
                                }}
                                isDisabled={loading || (user.role === 'admin' && allUsers.filter(u => u.role === 'admin' && u.active).length <= 1 && user.active)}
                                className={`
                                  ${user.active 
                                    ? '[&>div>div:first-child]:data-[selected]:bg-green-600 [&>div>div:first-child]:data-[selected]:border-green-700 [&>div>div:first-child]:bg-input' 
                                    : '[&>div>div:first-child]:bg-red-600 [&>div>div:first-child]:data-[selected]:bg-red-600 [&>div>div:first-child]:data-[selected]:border-red-700'}
                                  [&>div>div:first-child]:opacity-100
                                  [&>div>div:first-child]:data-[disabled]:opacity-100
                                `}
                              >
                                <span className={`text-sm font-medium ml-2 ${user.active ? 'text-green-600' : 'text-red-600'}`}>
                                  {user.active ? 'Habilitado' : 'Deshabilitado'}
                                </span>
                              </Switch>
                            </div>
                          </div>
                        </td>
                        <td className={`p-4 ${isDisabled ? 'opacity-50 grayscale' : ''}`}>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="bg-gray-900 hover:bg-gray-800 text-green-500 hover:text-green-400 font-medium"
                              onClick={() => openEditModal(user)}
                              disabled={loading || isDisabled}
                              title="Modificar usuario"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Modificar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Tabla de Administradores */}
        <Card className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-primary/10">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Administradores / Super Usuarios</h3>
              <Badge variant="secondary" className="ml-2">{admins.length}</Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 font-semibold">Usuario</th>
                  <th className="text-left p-4 font-semibold">Nivel Usuario</th>
                  <th className="text-left p-4 font-semibold">Sucursal</th>
                  <th className="text-left p-4 font-semibold">Estado</th>
                  <th className="text-left p-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No hay administradores registrados
                    </td>
                  </tr>
                ) : (
                  admins.map((user, index) => {
                    const isDisabled = !user.active;
                    const canDisable = !(user.role === 'admin' && users.filter(u => u.role === 'admin' && u.active).length <= 1);
                    return (
                      <tr
                        key={user.id}
                        className={`border-b border-border/30 transition-all animate-fade-in hover:bg-muted/30`}
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <td className={`p-4 ${isDisabled ? 'opacity-50 grayscale' : ''}`}>
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${isDisabled ? 'bg-muted/50 text-muted-foreground' : 'bg-primary/20 glow-primary text-primary'}`}>
                              {user.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-medium ${isDisabled ? 'text-muted-foreground' : ''}`}>{user.name}</p>
                              <p className="text-sm text-muted-foreground">Correo: {user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`p-4 ${isDisabled ? 'opacity-50 grayscale' : ''}`}>{getRoleBadge(user.role)}</td>
                        <td className={`p-4 ${isDisabled ? 'opacity-50 grayscale' : ''}`}>
                          <span className="text-sm text-muted-foreground">Todas las sucursales</span>
                        </td>
                        <td className="p-4">
                          {/* Switch sin opacidad - siempre accesible */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                isSelected={!!user.active}
                                onSelectionChange={(isSelected) => {
                                  if (isSelected !== !!user.active) {
                                    toggleUserStatus(user.id, user.name || 'Usuario', !!user.active, user.role);
                                  }
                                }}
                                isDisabled={loading || (user.role === 'admin' && allUsers.filter(u => u.role === 'admin' && u.active).length <= 1 && user.active)}
                                className={`
                                  ${user.active 
                                    ? '[&>div>div:first-child]:data-[selected]:bg-green-600 [&>div>div:first-child]:data-[selected]:border-green-700 [&>div>div:first-child]:bg-input' 
                                    : '[&>div>div:first-child]:bg-red-600 [&>div>div:first-child]:data-[selected]:bg-red-600 [&>div>div:first-child]:data-[selected]:border-red-700'}
                                  [&>div>div:first-child]:opacity-100
                                  [&>div>div:first-child]:data-[disabled]:opacity-100
                                `}
                              >
                                <span className={`text-sm font-medium ml-2 ${user.active ? 'text-green-600' : 'text-red-600'}`}>
                                  {user.active ? 'Habilitado' : 'Deshabilitado'}
                                </span>
                              </Switch>
                            </div>
                          </div>
                        </td>
                        <td className={`p-4 ${isDisabled ? 'opacity-50 grayscale' : ''}`}>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="bg-gray-900 hover:bg-gray-800 text-green-500 hover:text-green-400 font-medium"
                              onClick={() => openEditModal(user)}
                              disabled={loading || isDisabled}
                              title="Modificar usuario"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Modificar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Tabla de Usuarios Deshabilitados (todas los roles) */}
        <Card className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-destructive/5">
            <div className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-lg">Usuarios Deshabilitados</h3>
              <Badge variant="outline" className="ml-2 text-xs bg-red-600/10 text-red-700 border-red-200">
                {disabledUsers.length}
              </Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 font-semibold">Usuario</th>
                  <th className="text-left p-4 font-semibold">Rol</th>
                  <th className="text-left p-4 font-semibold">Sucursal</th>
                  <th className="text-left p-4 font-semibold">Estado</th>
                  <th className="text-left p-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {disabledUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No hay usuarios deshabilitados
                    </td>
                  </tr>
                ) : (
                  disabledUsers.map((user, index) => {
                    const assignedStore = stores.find(s => s.id === user.assigned_store_id);
                    const roleLabel = roles.find(r => r.key === user.role)?.name || user.role;
                    const isAdmin = user.role === 'admin';
                    const isLastAdminActive = isAdmin && allUsers.filter(u => u.role === 'admin' && u.active).length <= 0;

                    return (
                      <tr
                        key={user.id}
                        className="border-b border-border/30 transition-all animate-fade-in hover:bg-muted/30"
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <td className="p-4 opacity-70">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-muted/60 text-muted-foreground">
                              {user.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-muted-foreground">{user.name}</p>
                              <p className="text-sm text-muted-foreground">Correo: {user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 opacity-70">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="p-4 opacity-70">
                          {user.role === 'admin' ? (
                            <span className="text-sm text-muted-foreground">Todas las sucursales</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {assignedStore?.name || 'Sin asignar'}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Switch
                              isSelected={!!user.active}
                              onSelectionChange={(isSelected) => {
                                if (isSelected !== !!user.active) {
                                  toggleUserStatus(user.id, user.name || 'Usuario', !!user.active, user.role);
                                }
                              }}
                              isDisabled={loading || (isAdmin && isLastAdminActive)}
                              className={`
                                [&>div>div:first-child]:bg-red-600
                                [&>div>div:first-child]:data-[selected]:bg-green-600
                                [&>div>div:first-child]:data-[selected]:border-green-700
                                [&>div>div:first-child]:opacity-100
                              `}
                            >
                              <span className="text-sm font-medium ml-2 text-red-600">
                                Deshabilitado
                              </span>
                            </Switch>
                          </div>
                        </td>
                        <td className="p-4 opacity-90">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-400 text-gray-700 hover:bg-gray-100"
                              onClick={() => openEditModal(user)}
                              disabled={loading}
                              title={`Modificar usuario (${roleLabel})`}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Modificar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>


      {/* Role Permissions */}
      <Card className="p-6 glass-card">
        <h3 className="text-lg font-semibold mb-4">Permisos por Rol</h3>
        <div className="grid grid-cols-1 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div key={role.key} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Icon className={`w-5 h-5 text-${role.color}`} />
                  <h4 className="font-medium">{role.name}</h4>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {role.key === "admin" && (
                    <>
                      <p>• Acceso completo al sistema</p>
                      <p>• Gestión de usuarios y tiendas</p>
                      <p>• Configuración del sistema</p>
                      <p>• Todos los reportes</p>
                    </>
                  )}
                  {role.key === "manager" && (
                    <>
                      <p>• Gestión de su(s) tienda(s)</p>
                      <p>• Reportes de tienda</p>
                      <p>• Gestión de inventario</p>
                      <p>• Supervisión de cajeros</p>
                    </>
                  )}
                  {role.key === "cashier" && (
                    <>
                      <p>• Acceso al POS</p>
                      <p>• Consulta de productos</p>
                      <p>• Arqueos de caja</p>
                      <p>• Reportes básicos</p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Modal Unificado de Modificación de Usuario */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modificar Usuario</DialogTitle>
            <DialogDescription>
              Modifica la información y contraseña del usuario {editUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Sección de Datos Generales */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Datos Generales</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre completo</Label>
                  <Input 
                    type="text" 
                    placeholder="Nombre del usuario" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Correo electrónico</Label>
                  <Input 
                    type="email" 
                    placeholder="correo@dominio.com" 
                    value={editEmail} 
                    onChange={(e) => setEditEmail(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <select
                    className="w-full bg-background border rounded-md px-3 py-2"
                    value={editRole}
                    onChange={(e) => {
                      setEditRole(e.target.value as any);
                      if (e.target.value === 'admin') {
                        setEditStoreId('');
                      }
                    }}
                    disabled={editUser?.role === 'admin' && users.filter(u => u.role === 'admin' && u.active).length <= 1}
                  >
                    {roles.map((r) => (
                      <option key={r.key} value={r.key}>{r.name}</option>
                    ))}
                  </select>
                  {editUser?.role === 'admin' && users.filter(u => u.role === 'admin' && u.active).length <= 1 && (
                    <p className="text-xs text-muted-foreground">No se puede cambiar el rol del último administrador</p>
                  )}
                </div>
                {editRole !== 'admin' && (
                  <div className="space-y-2">
                    <Label>Tienda asignada</Label>
                    <select
                      className="w-full bg-background border rounded-md px-3 py-2"
                      value={editStoreId}
                      onChange={(e) => setEditStoreId(e.target.value)}
                    >
                      <option value="">Seleccione una tienda</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Separador */}
            <div className="border-t border-border/50" />

            {/* Sección de Restablecer Contraseña */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Restablecer Contraseña</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nueva Contraseña</Label>
                  <Input 
                    type="password" 
                    placeholder="Mínimo 6 caracteres (dejar vacío para no cambiar)" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                  />
                </div>
                {newPassword && (
                  <div className="space-y-2">
                    <Label>Confirmar Contraseña</Label>
                    <Input 
                      type="password" 
                      placeholder="Confirme la contraseña" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => {
              closeEditModal();
              setNewPassword("");
              setConfirmPassword("");
            }}>Cancelar</Button>
            <Button 
              disabled={loading || (newPassword && (newPassword.length < 6 || newPassword !== confirmPassword))} 
              onClick={async () => {
                try {
                  // Si hay nueva contraseña, validar primero
                  if (newPassword) {
                    if (newPassword.length < 6) {
                      toast({ 
                        title: "Contraseña inválida", 
                        description: "La contraseña debe tener al menos 6 caracteres.", 
                        variant: "destructive" 
                      });
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      toast({ 
                        title: "Contraseñas no coinciden", 
                        description: "Las contraseñas deben ser iguales.", 
                        variant: "destructive" 
                      });
                      return;
                    }
                  }

                  // Primero actualizar datos generales
                  await updateUser();

                  // Si hay nueva contraseña, restablecerla
                  if (newPassword && newPassword.length >= 6 && newPassword === confirmPassword) {
                    await resetPassword();
                  }

                  // Cerrar modal y limpiar
                  closeEditModal();
                  setNewPassword("");
                  setConfirmPassword("");
                } catch (error) {
                  // Los errores ya son manejados por updateUser y resetPassword
                  console.error('Error updating user:', error);
                }
              }}
              className="bg-primary hover:bg-primary/90"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}