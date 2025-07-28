"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface AuthContextType {
  user: any;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const sendPasswordReset = async (email: string) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login?reset=1",
    });
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, sendPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
