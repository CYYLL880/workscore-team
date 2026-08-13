import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, empNoToEmail } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!data) {
      // Profile 不存在（用户已被删除），自动登出
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    // 启动时恢复已有 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setLoading(false);
    });

    // 监听登录/登出
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) loadProfile(newSession.user.id);
        else { setProfile(null); setLoading(false); }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 工号 + 密码登录
  const signIn = async (empNo, password) => {
    return supabase.auth.signInWithPassword({
      email: empNoToEmail(empNo.trim()),
      password,
    });
  };

  // 注册（工号 + 密码 + 姓名）
  const signUp = async (empNo, password, name) => {
    return supabase.auth.signUp({
      email: empNoToEmail(empNo.trim()),
      password,
      options: { data: { emp_no: empNo.trim(), name: name || empNo.trim() } },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const value = {
    session,
    profile,
    loading,
    user: session?.user ?? null,
    empNo: profile?.emp_no ?? null,
    name: profile?.name ?? null,
    role: profile?.role ?? 'user',
    isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin',
    isSuperAdmin: profile?.role === 'super_admin',
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
