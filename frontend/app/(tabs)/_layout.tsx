import { Colors } from '@/constants/theme';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const icon = (emoji: string) =>
  ({ color }: { color: string }) => <Text style={{ fontSize: 20, opacity: color === Colors.navy ? 1 : 0.45 }}>{emoji}</Text>;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.white, borderTopColor: Colors.border },
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: icon('📅') }} />
      <Tabs.Screen name="plan" options={{ title: 'My Plan', tabBarIcon: icon('📋') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}
