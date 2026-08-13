import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../lib/alert';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [empNo, setEmpNo] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const emp = empNo.trim();
    if (!emp || !password.trim()) {
      showAlert('提示', '请输入工号和密码');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      showAlert('提示', '请输入姓名');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(emp, password);
        if (error) {
          showAlert('登录失败', error.message);
        }
      } else {
        // 注册
        const { data, error } = await signUp(emp, password, name.trim());
        if (error) {
          showAlert('注册失败', error.message);
        } else if (data?.session) {
          // 已自动登录（Supabase 关闭了邮箱验证），AuthContext 会自动加载
          showAlert('注册成功', `欢迎加入，${name.trim()}`);
        } else {
          // 未自动登录（邮箱验证开启）→ 切换到登录模式并预填工号
          showAlert('注册成功', '请使用工号和密码登录');
          setMode('login');
          setPassword('');
          setName('');
        }
      }
    } catch (e) {
      showAlert('错误', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>工分统计</Text>
        <Text style={styles.subtitle}>团队协作平台</Text>
      </View>

      <View style={styles.card}>
        {mode === 'register' && (
          <TextInput
            style={styles.input}
            placeholder="姓名"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#94a3b8"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="工号"
          value={empNo}
          onChangeText={setEmpNo}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#94a3b8"
        />

        <TextInput
          style={styles.input}
          placeholder="密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.buttonText}>
                {mode === 'login' ? '登录中...' : '注册中...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'login' ? '登录' : '注册'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          activeOpacity={0.6}
        >
          <Text style={styles.switchText}>
            {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef4fb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1e3a5f',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    letterSpacing: 1,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 20,
    padding: 26,
    shadowColor: '#1e3a5f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  input: {
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dbe7f3',
  },
  button: {
    height: 50,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
  switchBtn: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchText: {
    color: '#3b82f6',
    fontSize: 14,
  },
});
