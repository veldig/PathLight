import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';

const queryClient = new QueryClient();

function AuthGate() {
  const { session, loaded, setSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session)).catch(() => setSession(null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const inAuth = segments[0] === '(auth)';
    const onLoginScreen = (segments as string[])[1] === 'login';
    if (!session && !inAuth) router.replace('/(auth)/login');
    if (session && onLoginScreen) router.replace('/(tabs)');
  }, [session, loaded, segments]);

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
