import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  UserPlus, 
  Shield, 
  User,
  Mail,
  Search,
  Ban,
  CheckCircle
} from 'lucide-react';
import type { Profile, UserRole, AppRole } from '@/types/database';

interface UserWithRole extends Profile {
  role: AppRole;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('user');
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banning, setBanning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    // Fetch roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      setLoading(false);
      return;
    }

    // Combine profiles with roles
    const usersWithRoles: UserWithRole[] = (profiles as Profile[]).map(profile => {
      const userRole = (roles as UserRole[]).find(r => r.user_id === profile.user_id);
      return {
        ...profile,
        role: (userRole?.role as AppRole) || 'user',
        is_banned: (profile as any).is_banned || false,
        banned_at: (profile as any).banned_at || null,
        banned_reason: (profile as any).banned_reason || null,
      };
    });

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const handleCreateAdmin = async () => {
    if (!email || !password || !fullName) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    // Create user via auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      toast({
        title: 'Erreur',
        description: authError.message,
        variant: 'destructive',
      });
      setCreating(false);
      return;
    }

    // If role is admin, update the user_roles table
    if (authData.user && role === 'admin') {
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', authData.user.id);

      if (roleError) {
        console.error('Error updating role:', roleError);
      }
    }

    toast({
      title: 'Succès',
      description: 'Utilisateur créé avec succès',
    });

    setShowAddDialog(false);
    setEmail('');
    setPassword('');
    setFullName('');
    setRole('user');
    setCreating(false);
    
    // Refresh users list
    setTimeout(fetchUsers, 1000);
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le rôle',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Succès',
      description: 'Rôle mis à jour',
    });
    
    fetchUsers();
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    
    setBanning(true);
    
    const isBanned = !selectedUser.is_banned;
    const { error } = await supabase
      .from('profiles')
      .update({
        is_banned: isBanned,
        banned_at: isBanned ? new Date().toISOString() : null,
        banned_reason: isBanned ? banReason : null,
      })
      .eq('user_id', selectedUser.user_id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le statut de bannissement',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: isBanned ? 'Utilisateur banni' : 'Utilisateur débanni',
      });
      fetchUsers();
    }

    setBanning(false);
    setBanDialogOpen(false);
    setSelectedUser(null);
    setBanReason('');
  };

  const openBanDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setBanReason(user.banned_reason || '');
    setBanDialogOpen(true);
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestion des utilisateurs</CardTitle>
            <CardDescription>{users.length} utilisateur{users.length > 1 ? 's' : ''}</CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Créer un compte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouveau compte</DialogTitle>
                <DialogDescription>Créer un compte utilisateur ou administrateur</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom complet</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemple.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Utilisateur</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateAdmin} disabled={creating} className="w-full">
                  {creating ? 'Création...' : 'Créer le compte'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou rôle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
                  </TableCell>
                </TableRow>
              ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || 'Non renseigné'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.role === 'admin' ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <User className="h-3 w-3 mr-1" />
                        Utilisateur
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
                        <Ban className="h-3 w-3 mr-1" />
                        Banni
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Actif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant={user.is_banned ? 'outline' : 'destructive'}
                        size="sm"
                        onClick={() => openBanDialog(user)}
                      >
                        {user.is_banned ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Débannir
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4 mr-1" />
                            Bannir
                          </>
                        )}
                      </Button>
                      <Select
                        value={user.role}
                        onValueChange={(v) => updateUserRole(user.user_id, v as AppRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Utilisateur</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.is_banned ? 'Débannir l\'utilisateur' : 'Bannir l\'utilisateur'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.is_banned 
                ? `Voulez-vous débannir ${selectedUser?.full_name || selectedUser?.email}?`
                : `Bannir ${selectedUser?.full_name || selectedUser?.email} pour abus de signalements?`
              }
            </DialogDescription>
          </DialogHeader>
          
          {!selectedUser?.is_banned && (
            <div className="space-y-2">
              <Label>Raison du bannissement</Label>
              <Input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Ex: Faux signalements répétés..."
              />
            </div>
          )}

          {selectedUser?.is_banned && selectedUser?.banned_reason && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium">Raison du bannissement:</p>
              <p className="text-sm text-muted-foreground">{selectedUser.banned_reason}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Banni le: {new Date(selectedUser.banned_at!).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant={selectedUser?.is_banned ? 'default' : 'destructive'}
              onClick={handleBanUser}
              disabled={banning}
            >
              {banning ? 'Traitement...' : selectedUser?.is_banned ? 'Débannir' : 'Bannir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
