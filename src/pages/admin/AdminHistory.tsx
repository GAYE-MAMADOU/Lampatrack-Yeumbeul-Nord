import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { LampadaireHistory } from '@/types/database';

interface AdminHistoryProps {
  history: LampadaireHistory[];
  loading: boolean;
  onDeleteHistory?: (id: string) => Promise<boolean>;
}

export default function AdminHistory({ history, loading, onDeleteHistory }: AdminHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    
    const query = searchQuery.toLowerCase();
    return history.filter(entry => 
      entry.lampadaire?.identifier?.toLowerCase().includes(query) ||
      entry.action?.toLowerCase().includes(query) ||
      entry.technician_name?.toLowerCase().includes(query) ||
      entry.intervention_type?.toLowerCase().includes(query)
    );
  }, [history, searchQuery]);

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    if (status === 'functional') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Fonctionnel
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
        <AlertCircle className="h-3 w-3 mr-1" />
        Endommagé
      </Badge>
    );
  };

  const handleDeleteClick = (id: string) => {
    setSelectedHistoryId(id);
    setPassword('');
    setPasswordError('');
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!password) {
      setPasswordError('Veuillez entrer votre mot de passe');
      return;
    }

    // Get current user email
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setPasswordError('Impossible de vérifier l\'utilisateur');
      return;
    }

    // Verify password by attempting to sign in
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (authError) {
      setPasswordError('Mot de passe incorrect');
      return;
    }

    if (!selectedHistoryId || !onDeleteHistory) return;

    setIsDeleting(true);
    const success = await onDeleteHistory(selectedHistoryId);
    setIsDeleting(false);

    if (success) {
      setDeleteDialogOpen(false);
      setSelectedHistoryId(null);
      setPassword('');
    }
  };

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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique des interventions
          </CardTitle>
          <CardDescription>
            {filteredHistory.length} enregistrement{filteredHistory.length > 1 ? 's' : ''} 
            {searchQuery && ` (sur ${history.length} au total)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par identifiant, action, technicien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {filteredHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? 'Aucun résultat trouvé' : 'Aucun historique disponible'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date / Heure</TableHead>
                    <TableHead>Lampadaire</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Changement d'état</TableHead>
                    <TableHead>Technicien</TableHead>
                    <TableHead>Type d'intervention</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.lampadaire?.identifier || 'N/A'}
                      </TableCell>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell>
                        {entry.previous_status && entry.new_status ? (
                          <div className="flex items-center gap-2">
                            {getStatusBadge(entry.previous_status)}
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            {getStatusBadge(entry.new_status)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.technician_name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {entry.intervention_type || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {onDeleteHistory && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteClick(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog with password */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Veuillez entrer votre mot de passe de connexion pour confirmer la suppression.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting || !password}
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
