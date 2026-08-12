import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://gylmlphfwspopgsarwgt.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5bG1scGhmd3Nwb3Bnc2Fyd2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MTA4NzksImV4cCI6MjEwMjA4Njg3OX0.Rxmf6F8n3f6da-rZRSkUZ_8VAyMVw2W31E8D5uyok00';

// React Native 环境下用 AsyncStorage 持久化 session
const customStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

export const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 工号 <-> email 转换：工号作为 email 的本地部分
export const empNoToEmail = (empNo) => `${empNo}@workscores.app`;
export const emailToEmpNo = (email) => (email ? email.split('@')[0] : '');
