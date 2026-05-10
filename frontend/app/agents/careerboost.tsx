import { Colors, Radius, Shadow } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CareerBoostScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { backgroundColor: Colors.navy }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.sage, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.iconWrap, { backgroundColor: '#e8eef7' }]}>
            <Text style={{ fontSize: 28 }}>💼</Text>
          </View>
          <Text style={styles.headerTitle}>CareerBoost Agent</Text>
          <Text style={styles.headerSub}>Jobs, cover letters & applications</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>🚧</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 6 }}>Coming Soon</Text>
          <Text style={{ fontSize: 13, color: Colors.textMid, textAlign: 'center' }}>CareerBoost is being built. Check back soon!</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 13, color: Colors.textLight },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 14 },
});
