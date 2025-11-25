import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, Building2, Lock, Edit } from 'lucide-react';
import { EditProfileModal } from '@/components/auth/EditProfileModal';

export const UserMenu: React.FC = () => {
  const { userProfile, company, signOut } = useAuth();
  const [showEditProfile, setShowEditProfile] = React.useState(false);

  if (!userProfile || !company) {
    return null;
  }

  const initials = userProfile.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabels = {
    admin: 'Administrador',
    manager: 'Gerente',
    cashier: 'Cajero'
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userProfile.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userProfile.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Building2 className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span className="text-sm">{company.name}</span>
              <span className="text-xs text-muted-foreground">
                {roleLabels[userProfile.role as keyof typeof roleLabels]}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowEditProfile(true)}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Editar Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Modal para editar perfil */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />
    </>
  );
};
