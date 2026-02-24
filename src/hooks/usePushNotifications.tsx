import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = 'BEkNKqoY4CBrp2jpHEdcG98BSk5IqizxXPhrI1IbOSZiOiEHTXcZka2cKLbxvxr8LZ-c-dr47O73g0a--tAeu7o';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<string>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission as string);
      checkSubscription();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      // @ts-expect-error pushManager is available in modern browsers
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    }
  }, [user]);

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return;
    if (!VAPID_PUBLIC_KEY) {
      toast.error('Les notifications push ne sont pas encore configurées.');
      return;
    }

    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm as string);
      if (perm !== 'granted') {
        toast.error('Permission refusée pour les notifications.');
        setLoading(false);
        return;
      }

      // @ts-expect-error pushManager is available in modern browsers
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('Notifications push activées !');
    } catch (err) {
      console.error('Push subscribe error:', err);
      toast.error("Impossible d'activer les notifications.");
    } finally {
      setLoading(false);
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      // @ts-expect-error pushManager is available in modern browsers
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint);
      }
      setIsSubscribed(false);
      toast.success('Notifications push désactivées.');
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      toast.error('Impossible de désactiver les notifications.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe };
}
