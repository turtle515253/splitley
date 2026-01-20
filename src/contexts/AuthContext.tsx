import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { saveDeviceState, loadDeviceState } from '@/lib/storage';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  // Persist auth data to device storage (non-blocking)
  const persistAuthToDevice = (session: Session | null, provider: 'email' | 'google') => {
    if (session?.user && session.refresh_token) {
      saveDeviceState({
        auth: {
          user_id: session.user.id,
          refresh_token: session.refresh_token,
          provider,
        },
      });
    }
  };

  // Clear auth from device storage (non-blocking)
  const clearAuthFromDevice = () => {
    saveDeviceState({ auth: null });
  };

  useEffect(() => {
    // Load device state silently on startup (non-blocking)
    loadDeviceState().then((deviceState) => {
      // If we have a stored refresh token and no active session, 
      // Supabase will auto-recover via its own persistence
      // This is just for awareness/logging
      if (deviceState?.auth?.refresh_token) {
        console.log('Device auth data available for recovery');
      }
    });

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Persist auth to device storage on login events
        if (event === 'SIGNED_IN' && session) {
          const provider = session.user?.app_metadata?.provider === 'google' ? 'google' : 'email';
          persistAuthToDevice(session, provider);
        }
        
        // Clear auth from device storage on logout
        if (event === 'SIGNED_OUT') {
          clearAuthFromDevice();
        }
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
        // Also persist existing session to device storage
        const provider = session.user?.app_metadata?.provider === 'google' ? 'google' : 'email';
        persistAuthToDevice(session, provider);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Invalid email or password' };
      }
      return { error: error.message };
    }

    return {};
  };

  const signup = async (name: string, email: string, password: string): Promise<{ error?: string }> => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return { error: 'An account with this email already exists' };
      }
      return { error: error.message };
    }

    return {};
  };

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    // Auth cleared via onAuthStateChange SIGNED_OUT event
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error?: string }> => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      return { error: error.message };
    }

    // Refresh profile
    const updatedProfile = await fetchProfile(user.id);
    setProfile(updatedProfile);

    return {};
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      isLoading, 
      login, 
      signup, 
      signInWithGoogle, 
      logout, 
      updateProfile 
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
