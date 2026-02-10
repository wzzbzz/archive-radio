import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  showLoginModal: boolean;
  
  // Actions
  setShowLoginModal: (show: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  isLoading: true,
  showLoginModal: false,

  setShowLoginModal: (show: boolean) => set({ showLoginModal: show }),

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user is admin by checking user metadata or a separate admins table
        const { data: adminData } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', data.user.id)
          .single();

        set({ 
          user: data.user, 
          isAdmin: !!adminData,
          showLoginModal: false 
        });
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, isAdmin: false });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  checkAuth: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user is admin
        const { data: adminData } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', user.id)
          .single();

        set({ user, isAdmin: !!adminData, isLoading: false });
      } else {
        set({ user: null, isAdmin: false, isLoading: false });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      set({ user: null, isAdmin: false, isLoading: false });
    }
  },
}));
