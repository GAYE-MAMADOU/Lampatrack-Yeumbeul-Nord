import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLampadaires, useSignalements } from '@/hooks/useLampadaires';
import LampadaireMap from '@/components/map/LampadaireMap';
import ReportForm from '@/components/report/ReportForm';
import { isInYeumbeulNord } from '@/lib/zoneCheck';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { 
  Lamp, 
  LogOut, 
  Settings, 
  Menu, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Search,
  X,
  Filter,
  Sun,
  Moon,
  Bell,
  BellOff
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Lampadaire } from '@/types/database';

export default function Index() {
  const { user, loading: authLoading, isAdmin, signOut } = useAuth();
  const { lampadaires, loading: lampadairesLoading } = useLampadaires();
  const { signalements, createSignalement } = useSignalements();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, loading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();

  
  const [selectedLampadaire, setSelectedLampadaire] = useState<Lampadaire | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'functional' | 'damaged'>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user's current location
  useEffect(() => {
    if (!isAdmin && navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError(null);
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          setLocationError('Impossible d\'obtenir votre position');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }
  }, [isAdmin]);

  // Filter lampadaires based on search and status
  const filteredLampadaires = useMemo(() => {
    let filtered = lampadaires;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l => l.identifier.toLowerCase().includes(query));
    }
    
    return filtered;
  }, [lampadaires, searchQuery, statusFilter]);

  // Search results for dropdown
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return lampadaires
      .filter(l => l.identifier.toLowerCase().includes(query))
      .slice(0, 5);
  }, [lampadaires, searchQuery]);

  // Callback for lampadaire click - must be before early returns
  const handleLampadaireClick = useCallback((lampadaire: Lampadaire) => {
    setSelectedLampadaire(lampadaire);
    setShowReportForm(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || lampadairesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleReport = () => {
    if (!selectedLampadaire) return;
    
    // Admins can report from anywhere
    if (isAdmin) {
      setShowReportForm(true);
      return;
    }
    
    // Check if we have user location
    if (!userLocation) {
      toast.error('Veuillez activer la géolocalisation pour faire un signalement.');
      return;
    }
    
    // Check if user is within the Yeumbeul Nord zone
    if (!isInYeumbeulNord(userLocation.lat, userLocation.lng)) {
      toast.error('Vous êtes en dehors de la zone de Yeumbeul Nord. Vous devez être dans la zone pour faire un signalement.');
      return;
    }
    
    setShowReportForm(true);
  };

  const handleSubmitReport = async (cause: string, description: string | null, photoUrl: string) => {
    if (!selectedLampadaire || !user) return;
    
    await createSignalement(
      selectedLampadaire.id,
      user.id,
      cause,
      description,
      photoUrl
    );
    
    setShowReportForm(false);
    setSelectedLampadaire(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Get user's signalements
  const userSignalements = signalements.filter(s => s.user_id === user.id);
  const pendingCount = userSignalements.filter(s => s.status === 'pending').length;
  const approvedCount = userSignalements.filter(s => s.status === 'approved').length;
  const rejectedCount = userSignalements.filter(s => s.status === 'rejected').length;

  // Stats
  const functionalCount = lampadaires.filter(l => l.status === 'functional').length;
  const damagedCount = lampadaires.filter(l => l.status === 'damaged').length;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between z-[1001] relative">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Lamp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">LampaTrack</h1>
            <p className="text-xs text-muted-foreground">Suivi des lampadaires</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={statusFilter !== 'all' ? 'default' : 'ghost'} 
                size="icon"
              >
                <Filter className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuRadioGroup value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <DropdownMenuRadioItem value="all">
                  Tous ({lampadaires.length})
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="functional">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Fonctionnels ({functionalCount})
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="damaged">
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                  Endommagés ({damagedCount})
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Basculer le thème"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Search button */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Stats badges */}
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {functionalCount}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              {damagedCount}
            </Badge>
          </div>

          {/* Menu */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {/* User info */}
                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {isAdmin ? 'Administrateur' : 'Utilisateur'}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-green-500/10 text-center">
                    <p className="text-2xl font-bold text-green-600">{functionalCount}</p>
                    <p className="text-xs text-muted-foreground">Fonctionnels</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 text-center">
                    <p className="text-2xl font-bold text-red-600">{damagedCount}</p>
                    <p className="text-xs text-muted-foreground">Endommagés</p>
                  </div>
                </div>

                {/* User signalements */}
                <div className="space-y-2">
                  <p className="font-medium text-sm">Mes signalements</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {pendingCount} en attente
                    </Badge>
                    <Badge variant="secondary" className="gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      {approvedCount}
                    </Badge>
                    <Badge variant="secondary" className="gap-1 text-red-600">
                      <XCircle className="h-3 w-3" />
                      {rejectedCount}
                    </Badge>
                  </div>
                </div>

                {/* Push notifications toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    {pushSubscribed ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <p className="text-sm font-medium">Notifications push</p>
                      <p className="text-xs text-muted-foreground">
                        {!pushSupported
                          ? 'Non disponible (ouvrez l\'app installée ou l\'URL directe)'
                          : pushSubscribed ? 'Activées' : 'Désactivées'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={pushSubscribed}
                    disabled={pushLoading || !pushSupported}
                    onCheckedChange={(checked) => checked ? pushSubscribe() : pushUnsubscribe()}
                  />
                </div>

                {/* Admin link */}
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/admin');
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    Dashboard Admin
                  </Button>
                )}

                {/* Sign out */}
                <Button 
                  variant="destructive" 
                  className="w-full justify-start gap-2"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Search bar */}
      {showSearch && (
        <div className="bg-card border-b px-4 py-2 relative z-[1001]">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un lampadaire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-full bg-card border rounded-b-lg shadow-lg max-w-md mx-auto">
              {searchResults.map((lamp) => (
                <button
                  key={lamp.id}
                  className="w-full px-4 py-3 text-left hover:bg-muted flex items-center justify-between border-b last:border-b-0"
                  onClick={() => {
                    setSelectedLampadaire(lamp);
                    setSearchQuery('');
                    setShowSearch(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium">{lamp.identifier}</span>
                  </div>
                  <Badge 
                    variant={lamp.status === 'functional' ? 'default' : 'destructive'}
                    className={lamp.status === 'functional' ? 'bg-green-500' : ''}
                  >
                    {lamp.status === 'functional' ? 'OK' : 'HS'}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <LampadaireMap
          lampadaires={filteredLampadaires}
          onLampadaireClick={handleLampadaireClick}
          selectedLampadaire={selectedLampadaire}
          showUserLocation={true}
        />

        {/* Zone indicator for non-admin users */}
        {!isAdmin && (
          <div className="absolute top-4 right-4 z-[1000]">
            {locationError ? (
              <Badge variant="outline" className="gap-2 bg-card shadow-md border-yellow-500 text-yellow-600">
                <MapPin className="h-3 w-3" />
                GPS non disponible
              </Badge>
            ) : userLocation ? (
              isInYeumbeulNord(userLocation.lat, userLocation.lng) ? (
                <Badge className="gap-2 bg-green-500 hover:bg-green-500 shadow-md">
                  <CheckCircle className="h-3 w-3" />
                  Dans la zone autorisée
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-2 shadow-md">
                  <XCircle className="h-3 w-3" />
                  Hors zone - Signalement désactivé
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="gap-2 bg-card shadow-md animate-pulse">
                <MapPin className="h-3 w-3" />
                Localisation en cours...
              </Badge>
            )}
          </div>
        )}

        {/* Selected lampadaire panel */}
        {selectedLampadaire && !showReportForm && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000] max-w-md mx-auto">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{selectedLampadaire.identifier}</CardTitle>
                  </div>
                  <Badge 
                    variant={selectedLampadaire.status === 'functional' ? 'default' : 'destructive'}
                    className={selectedLampadaire.status === 'functional' ? 'bg-green-500' : ''}
                  >
                    {selectedLampadaire.status === 'functional' ? 'Fonctionnel' : 'Endommagé'}
                  </Badge>
                </div>
                <CardDescription>
                  {selectedLampadaire.latitude.toFixed(6)}, {selectedLampadaire.longitude.toFixed(6)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setSelectedLampadaire(null)}
                  >
                    Fermer
                  </Button>
                  {selectedLampadaire.status === 'functional' && (
                    <Button 
                      className="flex-1 gap-2"
                      onClick={handleReport}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Signaler un problème
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Report form */}
        {showReportForm && selectedLampadaire && (
          <div className="absolute inset-0 z-[1000] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <ReportForm
              lampadaire={selectedLampadaire}
              onSubmit={handleSubmitReport}
              onCancel={() => {
                setShowReportForm(false);
                setSelectedLampadaire(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}