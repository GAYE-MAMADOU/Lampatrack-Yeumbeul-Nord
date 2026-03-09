import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, User, Mail, Calendar, Shield, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Profile() {
  const { user, loading: authLoading, role } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoadingProfile(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email, created_at')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setFullName(data.full_name || '');
      setEmail(data.email || user.email || '');
      setCreatedAt(data.created_at);
    } else {
      setEmail(user.email || '');
      setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
    }
    setLoadingProfile(false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast.error('Le nom complet ne peut pas être vide.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Erreur lors de la mise à jour du profil.');
    } else {
      toast.success('Profil mis à jour avec succès !');
    }
    setSaving(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg">Mon Profil</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Avatar & Role */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <Avatar className="h-20 w-20 text-xl">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
              {getInitials(fullName || email)}
            </AvatarFallback>
          </Avatar>
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" />
            {role === 'admin' ? 'Administrateur' : 'Utilisateur'}
          </Badge>
        </div>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations personnelles</CardTitle>
            <CardDescription>Modifiez vos informations de profil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Nom complet
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Votre nom complet"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Adresse e-mail
              </Label>
              <Input
                id="email"
                value={email}
                disabled
                className="opacity-70"
              />
              <p className="text-xs text-muted-foreground">
                L'adresse e-mail ne peut pas être modifiée.
              </p>
            </div>

            <Separator />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Membre depuis {memberSince}</span>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
