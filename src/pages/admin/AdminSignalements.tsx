import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Image as ImageIcon,
  Calendar,
  AlertCircle,
  User,
  Mail
} from 'lucide-react';
import SignedImage from '@/components/SignedImage';
import type { Signalement, Lampadaire } from '@/types/database';

interface AdminSignalementsProps {
  signalements: Signalement[];
  lampadaires: Lampadaire[];
  onProcess: (id: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>;
}

export default function AdminSignalements({ signalements, lampadaires, onProcess }: AdminSignalementsProps) {
  const [selectedSignalement, setSelectedSignalement] = useState<Signalement | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const pendingSignalements = signalements.filter(s => s.status === 'pending');
  const processedSignalements = signalements.filter(s => s.status !== 'pending');

  const handleProcess = async (status: 'approved' | 'rejected') => {
    if (!selectedSignalement) return;
    
    setProcessing(true);
    await onProcess(selectedSignalement.id, status, adminNotes);
    setProcessing(false);
    setSelectedSignalement(null);
    setAdminNotes('');
  };

  const getLampadaire = (id: string) => lampadaires.find(l => l.id === id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Signalements en attente
          </CardTitle>
          <CardDescription>
            {pendingSignalements.length} signalement{pendingSignalements.length > 1 ? 's' : ''} à traiter
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingSignalements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun signalement en attente
            </p>
          ) : (
            <div className="space-y-4">
              {pendingSignalements.map((signalement) => {
                const lampadaire = getLampadaire(signalement.lampadaire_id);
                return (
                  <div 
                    key={signalement.id} 
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{lampadaire?.identifier || 'Inconnu'}</h3>
                        <p className="text-sm text-muted-foreground">{signalement.cause}</p>
                      </div>
                      {getStatusBadge(signalement.status)}
                    </div>

                    {signalement.description && (
                      <p className="text-sm bg-muted p-2 rounded">{signalement.description}</p>
                    )}

                    {/* User info */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Signalé par:</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {signalement.profile?.full_name || 'Utilisateur inconnu'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {signalement.profile?.email || 'Email non renseigné'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(signalement.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      {lampadaire && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lampadaire.latitude.toFixed(4)}, {lampadaire.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <ImageIcon className="h-4 w-4 mr-1" />
                            Voir la photo
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Photo du signalement</DialogTitle>
                          </DialogHeader>
                          <SignedImage 
                            photoUrl={signalement.photo_url} 
                            alt="Signalement" 
                            className="w-full rounded-lg"
                          />
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => setSelectedSignalement(signalement)}
                          >
                            Traiter
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Traiter le signalement</DialogTitle>
                            <DialogDescription>
                              Lampadaire: {lampadaire?.identifier}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-medium mb-1">Cause signalée</p>
                              <p className="text-sm text-muted-foreground">{signalement.cause}</p>
                            </div>

                            {signalement.description && (
                              <div>
                                <p className="text-sm font-medium mb-1">Description</p>
                                <p className="text-sm text-muted-foreground">{signalement.description}</p>
                              </div>
                            )}

                            <div>
                              <p className="text-sm font-medium mb-2">Notes (optionnel)</p>
                              <Textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Ajouter des notes..."
                                rows={3}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleProcess('rejected')}
                                disabled={processing}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rejeter
                              </Button>
                              <Button
                                className="flex-1"
                                onClick={() => handleProcess('approved')}
                                disabled={processing}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approuver
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed */}
      <Card>
        <CardHeader>
          <CardTitle>Signalements traités</CardTitle>
          <CardDescription>Historique des signalements</CardDescription>
        </CardHeader>
        <CardContent>
          {processedSignalements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun signalement traité
            </p>
          ) : (
            <div className="space-y-2">
              {processedSignalements.slice(0, 10).map((signalement) => {
                const lampadaire = getLampadaire(signalement.lampadaire_id);
                return (
                  <div 
                    key={signalement.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{lampadaire?.identifier || 'Inconnu'}</p>
                      <p className="text-sm text-muted-foreground">{signalement.cause}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(signalement.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      {getStatusBadge(signalement.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
