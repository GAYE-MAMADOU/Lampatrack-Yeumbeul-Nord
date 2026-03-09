import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types/database';

export class BannedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'BannedError';
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkBanAndFetchRole(session.user.id).catch(() => {
              // Ban check failed silently - user was signed out
            });
          }, 0);
        } else {
          setRole(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkBanAndFetchRole(session.user.id).catch(() => {});
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkBanAndFetchRole = async (userId: string) => {
    // Check ban status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned, banned_reason')
      .eq('user_id', userId)
      .single();

    if (profile?.is_banned) {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
      return;
    }

    // Fetch role
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      setRole(data.role as AppRole);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = 'https://lampatrack-yeumbeul-nord.netlify.app/auth';
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) return { error };

    // Check if user is banned
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, banned_reason')
        .eq('user_id', data.user.id)
        .single();

      if (profile?.is_banned) {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setRole(null);
        const reason = profile.banned_reason || 'Votre compte a été suspendu.';
        return { error: new Error(`Compte bloqué : ${reason}`) };
      }
    }
    
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      role,
      isAdmin: role === 'admin',
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}