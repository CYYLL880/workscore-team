import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider, useApp } from './src/context/AppContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';

import HomeScreen from './src/screens/HomeScreen';
import CategoryDetailScreen from './src/screens/CategoryDetailScreen';
import WorkGroupEditScreen from './src/screens/WorkGroupEditScreen';
import OutputScreen from './src/screens/OutputScreen';
import CustomizeScreen from './src/screens/CustomizeScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import ScoreSheetScreen from './src/screens/ScoreSheetScreen';

const Stack = createNativeStackNavigator();

function MainApp() {
  const { isLoaded, loadError, reload } = useApp();

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>正在加载数据...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>加载失败：{loadError}</Text>
        <View style={styles.retryBtn}>
          <Text style={styles.retryText} onPress={reload}>重试</Text>
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f1f5f9' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="WorkGroupEdit" component={WorkGroupEditScreen} />
        <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
        <Stack.Screen name="Output" component={OutputScreen} />
        <Stack.Screen name="Customize" component={CustomizeScreen} />
        <Stack.Screen name="UserManagement" component={UserManagementScreen} />
        <Stack.Screen name="ScoreSheet" component={ScoreSheetScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

function Root() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <LoginScreen />;
  return <MainApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#eef4fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default App;
