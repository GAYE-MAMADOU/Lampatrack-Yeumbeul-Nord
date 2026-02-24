import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLampadaires, useSignalements, useLampadaireHistory } from '@/hooks/useLampadaires';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Lamp, 
  ArrowLeft, 
  BarChart3, 
  FileText, 
  MapPin, 
  Users,
  Clock
} from 'lucide-react';
import AdminSignalements from './AdminSignalements';
import AdminLampadaires from './AdminLampadaires';
import AdminStats from './AdminStats';
import AdminHistory from './AdminHistory';
import AdminUsers from './AdminUsers';

export default function AdminDashboard() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('signalements');

  const { lampadaires, loading: lampadairesLoading, fetchLampadaires, addLampadaire, updateLampadaire, deleteLampadaire } = useLampadaires();
  const { signalements, loading: signalementsLoading, fetchSignalements, processSignalement } = useSignalements();
  const { history, loading: historyLoading, fetchHistory, addHistory, deleteHistory } = useLampadaireHistory();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, authLoading, isAdmin, navigate]);

  if (authLoading || lampadairesLoading || signalementsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const pendingSignalements = signalements.filter(s => s.status === 'pending');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Lamp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Administration</h1>
            <p className="text-xs text-muted-foreground">Tableau de bord</p>
          </div>
        </div>

        {pendingSignalements.length > 0 && (
          <div className="bg-warning/10 text-warning px-3 py-1 rounded-full text-sm font-medium">
            {pendingSignalements.length} signalement{pendingSignalements.length > 1 ? 's' : ''} en attente
          </div>
        )}
      </header>

      {/* Content */}
      <div className="container mx-auto p-4 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="signalements" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Signalements</span>
            </TabsTrigger>
            <TabsTrigger value="lampadaires" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Lampadaires</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Statistiques</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signalements">
            <AdminSignalements
              signalements={signalements}
              lampadaires={lampadaires}
              onProcess={async (id, status, notes) => {
                const signalement = signalements.find(s => s.id === id);
                const success = await processSignalement(id, status, user.id, notes);
                
                if (success && status === 'approved' && signalement) {
                  await updateLampadaire(signalement.lampadaire_id, { status: 'damaged' });
                  await addHistory({
                    lampadaire_id: signalement.lampadaire_id,
                    action: 'Signalement approuvé',
                    previous_status: 'functional',
                    new_status: 'damaged',
                    technician_name: null,
                    intervention_type: null,
                    performed_by: user.id,
                  });
                  await fetchLampadaires();
                }
              }}
            />
          </TabsContent>

          <TabsContent value="lampadaires">
            <AdminLampadaires
              lampadaires={lampadaires}
              onAdd={addLampadaire}
              onUpdate={async (id, updates) => {
                const lampadaire = lampadaires.find(l => l.id === id);
                if (lampadaire && updates.status && updates.status !== lampadaire.status) {
                  await addHistory({
                    lampadaire_id: id,
                    action: updates.status === 'functional' ? 'Réparation' : 'Signalé endommagé',
                    previous_status: lampadaire.status,
                    new_status: updates.status,
                    technician_name: updates.technician_name,
                    intervention_type: updates.intervention_type,
                    performed_by: user.id,
                  });
                }
                return updateLampadaire(id, updates);
              }}
              onDelete={deleteLampadaire}
              onRefresh={fetchLampadaires}
            />
          </TabsContent>

          <TabsContent value="stats">
            <AdminStats
              lampadaires={lampadaires}
              signalements={signalements}
              history={history}
            />
          </TabsContent>

          <TabsContent value="history">
            <AdminHistory history={history} loading={historyLoading} onDeleteHistory={deleteHistory} />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
