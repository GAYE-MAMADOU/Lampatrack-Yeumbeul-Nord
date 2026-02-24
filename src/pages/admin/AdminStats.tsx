import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  TrendingUp 
} from 'lucide-react';
import type { Lampadaire, Signalement, LampadaireHistory } from '@/types/database';

interface AdminStatsProps {
  lampadaires: Lampadaire[];
  signalements: Signalement[];
  history: LampadaireHistory[];
}

export default function AdminStats({ lampadaires, signalements, history }: AdminStatsProps) {
  const functionalCount = lampadaires.filter(l => l.status === 'functional').length;
  const damagedCount = lampadaires.filter(l => l.status === 'damaged').length;
  
  const pendingCount = signalements.filter(s => s.status === 'pending').length;
  const approvedCount = signalements.filter(s => s.status === 'approved').length;
  const rejectedCount = signalements.filter(s => s.status === 'rejected').length;

  const statusData = [
    { name: 'Fonctionnels', value: functionalCount, color: '#22c55e' },
    { name: 'Endommagés', value: damagedCount, color: '#ef4444' },
  ];

  const signalementStatusData = [
    { name: 'En attente', value: pendingCount, color: '#f59e0b' },
    { name: 'Approuvés', value: approvedCount, color: '#22c55e' },
    { name: 'Rejetés', value: rejectedCount, color: '#ef4444' },
  ];

  // Group signalements by month for the line chart
  const signalementsByMonth = signalements.reduce((acc, s) => {
    const month = new Date(s.created_at).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthlyData = Object.entries(signalementsByMonth)
    .slice(-6)
    .map(([month, count]) => ({ month, signalements: count }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{functionalCount}</p>
                <p className="text-sm text-muted-foreground">Fonctionnels</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{damagedCount}</p>
                <p className="text-sm text-muted-foreground">Endommagés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{signalements.length}</p>
                <p className="text-sm text-muted-foreground">Total signalements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>État des lampadaires</CardTitle>
            <CardDescription>Répartition par statut</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statut des signalements</CardTitle>
            <CardDescription>Répartition par statut</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={signalementStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {signalementStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Évolution des signalements</CardTitle>
            <CardDescription>Nombre de signalements par mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="signalements" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Signalements"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Pas assez de données pour afficher le graphique
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
