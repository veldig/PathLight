import { useAuthStore } from '@/store/authStore';
import { loadAuth } from '@/lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';

const queryClient = new QueryClient();

function AuthGate() {
  const { token, loaded, setAuth, clearAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadAuth().then((stored) => {
      if (stored) {
        setAuth(stored.token, stored.user.userId, stored.user.email);
      } else {
        clearAuth();
      }
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const inAuth = segments[0] === '(auth)';
    const onLoginScreen = (segments as string[])[1] === 'login';
    if (!token && !inAuth) router.replace('/(auth)/login');
    if (token && onLoginScreen) router.replace('/(tabs)');
  }, [token, loaded, segments]);

  return null;
}

export default function RootLayout() {
  const { loaded } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <AuthGate />
      {!loaded ? (
        <View style={{ flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.sage} size="large" />
        </View>
      ) : (
        <Slot />
      )}
    </QueryClientProvider>
  );
}
