import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Lampadaire, Signalement, LampadaireHistory } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useLampadaires() {
  const [lampadaires, setLampadaires] = useState<Lampadaire[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLampadaires();
  }, []);

  const fetchLampadaires = async () => {
    setLoading(true);
    
    // Fetch all lampadaires by paginating (Supabase has 1000 row limit by default)
    let allLampadaires: Lampadaire[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('lampadaires')
        .select('*')
        .order('identifier')
        .range(from, from + pageSize - 1);

      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les lampadaires',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        allLampadaires = [...allLampadaires, ...(data as Lampadaire[])];
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    setLampadaires(allLampadaires);
    setLoading(false);
  };

  const addLampadaire = async (lampadaire: Omit<Lampadaire, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('lampadaires')
      .insert(lampadaire)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le lampadaire',
        variant: 'destructive',
      });
      return null;
    }

    setLampadaires(prev => [...prev, data as Lampadaire]);
    toast({
      title: 'Succès',
      description: 'Lampadaire ajouté avec succès',
    });
    return data;
  };

  const updateLampadaire = async (id: string, updates: Partial<Lampadaire> & { technician_name?: string; intervention_type?: string }) => {
    // Extract only the fields that belong to the lampadaires table
    const { technician_name, intervention_type, ...lampadaireUpdates } = updates;
    
    const { data, error } = await supabase
      .from('lampadaires')
      .update(lampadaireUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating lampadaire:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le lampadaire',
        variant: 'destructive',
      });
      return null;
    }

    setLampadaires(prev => prev.map(l => l.id === id ? data as Lampadaire : l));
    toast({
      title: 'Succès',
      description: 'Lampadaire mis à jour',
    });
    return data;
  };

  const deleteLampadaire = async (id: string) => {
    const { error } = await supabase
      .from('lampadaires')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le lampadaire',
        variant: 'destructive',
      });
      return false;
    }

    setLampadaires(prev => prev.filter(l => l.id !== id));
    toast({
      title: 'Succès',
      description: 'Lampadaire supprimé',
    });
    return true;
  };

  return {
    lampadaires,
    loading,
    fetchLampadaires,
    addLampadaire,
    updateLampadaire,
    deleteLampadaire,
  };
}

export function useSignalements() {
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSignalements();
  }, []);

  const fetchSignalements = async () => {
    setLoading(true);
    // Use the secure RPC function that hides admin_notes from non-admins
    const { data: signalementData, error } = await supabase
      .rpc('get_signalements_secure');

    if (error) {
      console.error('Error fetching signalements:', error);
      setLoading(false);
      return;
    }

    // Fetch related lampadaires and profiles separately
    const signalementIds = signalementData?.map(s => s.id) || [];
    const lampadaireIds = [...new Set(signalementData?.map(s => s.lampadaire_id) || [])];
    const userIds = [...new Set(signalementData?.map(s => s.user_id) || [])];

    const [lampadairesResult, profilesResult] = await Promise.all([
      supabase.from('lampadaires').select('*').in('id', lampadaireIds),
      supabase.from('profiles').select('*').in('user_id', userIds)
    ]);

    const lampadairesMap = new Map(lampadairesResult.data?.map(l => [l.id, l]) || []);
    const profilesMap = new Map(profilesResult.data?.map(p => [p.user_id, p]) || []);

    // Combine the data
    const enrichedSignalements = signalementData?.map(s => ({
      ...s,
      lampadaire: lampadairesMap.get(s.lampadaire_id) || null,
      profile: profilesMap.get(s.user_id) || null
    })) || [];

    setSignalements(enrichedSignalements as unknown as Signalement[]);
    setLoading(false);
  };

  const createSignalement = async (
    lampadaireId: string,
    userId: string,
    cause: string,
    description: string | null,
    photoUrl: string
  ) => {
    const { data, error } = await supabase
      .from('signalements')
      .insert({
        lampadaire_id: lampadaireId,
        user_id: userId,
        cause,
        description,
        photo_url: photoUrl,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le signalement',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'Signalement envoyé',
      description: 'Votre signalement est en attente de validation',
    });
    await fetchSignalements();
    return data;
  };

  const processSignalement = async (
    id: string,
    status: 'approved' | 'rejected',
    adminId: string,
    adminNotes?: string,
    userId?: string
  ) => {
    const { data: sigData } = await supabase
      .from('signalements')
      .select('user_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('signalements')
      .update({
        status,
        processed_by: adminId,
        processed_at: new Date().toISOString(),
        admin_notes: adminNotes,
      })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter le signalement',
        variant: 'destructive',
      });
      return false;
    }

    // Send push notification to the user who created the signalement
    const targetUserId = userId || sigData?.user_id;
    if (targetUserId) {
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: { signalement_id: id, user_id: targetUserId, new_status: status },
        });
      } catch (e) {
        console.warn('Push notification failed (non-blocking):', e);
      }
    }

    toast({
      title: 'Succès',
      description: status === 'approved' ? 'Signalement approuvé' : 'Signalement rejeté',
    });
    await fetchSignalements();
    return true;
  };

  return {
    signalements,
    loading,
    fetchSignalements,
    createSignalement,
    processSignalement,
  };
}

export function useLampadaireHistory() {
  const [history, setHistory] = useState<LampadaireHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    
    // Use secure RPC to hide technician_name from non-admins
    const { data: historyData, error } = await supabase.rpc('get_lampadaire_history_secure');

    if (!error && historyData) {
      // Fetch lampadaires separately for the join
      const lampadaireIds = [...new Set(historyData.map((h: { lampadaire_id: string }) => h.lampadaire_id))];
      const { data: lampadairesData } = await supabase
        .from('lampadaires')
        .select('*')
        .in('id', lampadaireIds);

      const lampadairesMap = new Map(lampadairesData?.map(l => [l.id, l]) || []);

      const historyWithLampadaires = historyData.map((h: LampadaireHistory) => ({
        ...h,
        lampadaire: lampadairesMap.get(h.lampadaire_id) || null,
      }));

      setHistory(historyWithLampadaires as LampadaireHistory[]);
    }
    setLoading(false);
  };

  const addHistory = async (historyEntry: Omit<LampadaireHistory, 'id' | 'created_at' | 'lampadaire'>) => {
    const { error } = await supabase
      .from('lampadaire_history')
      .insert(historyEntry);

    if (!error) {
      await fetchHistory();
    }
    return !error;
  };

  const deleteHistory = async (id: string) => {
    const { error } = await supabase
      .from('lampadaire_history')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'intervention',
        variant: 'destructive',
      });
      return false;
    }

    setHistory(prev => prev.filter(h => h.id !== id));
    toast({
      title: 'Succès',
      description: 'Intervention supprimée',
    });
    return true;
  };

  return {
    history,
    loading,
    fetchHistory,
    addHistory,
    deleteHistory,
  };
}
