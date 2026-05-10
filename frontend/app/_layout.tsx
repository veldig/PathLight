import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient();

function Redirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(tabs)');
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Redirect />
      <Slot />
    </QueryClientProvider>
  );
}
