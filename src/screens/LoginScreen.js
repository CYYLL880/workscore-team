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
  Alert,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

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
      Alert.alert('提示', '请输入工号和密码');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('提示', '请输入姓名');
      return;
    }

    setLoading(true);
    try {
      const { error } =
        mode === 'login'
          ? await signIn(emp, password)
          : await signUp(emp, password, name.trim());
      if (error) {
        Alert.alert(
          mode === 'login' ? '登录失败' : '注册失败',
          error.message
        );
      }
    } catch (e) {
      Alert.alert('错误', e.message);
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
            <ActivityIndicator color="#fff" />
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
