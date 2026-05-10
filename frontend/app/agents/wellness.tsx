import { Colors, Radius, Shadow } from '@/constants/theme';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function WellnessScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkin, setCheckin] = useState<{ message: string; streak: number } | null>(null);
  const [error, setError] = useState('');

  async function startCheckin() {
    setLoading(true);
    setError('');
    try {
      const result = await api.startCheckin() as any;
      setCheckin({ message: result.message, streak: result.streak });
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerIcon}><Text style={{ fontSize: 22 }}>🧠</Text></View>
        <Text style={styles.headerTitle}>WellnessGuide Agent</Text>
        <Text style={styles.headerSub}>Daily check-ins & mental health support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!checkin && !loading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>How are you doing today?</Text>
            <Text style={styles.emptySub}>Take 2 minutes for yourself. Your WellnessGuide is here to listen and support you — no matter what kind of day you're having.</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={startCheckin}>
              <Text style={styles.actionBtnText}>Start Today's Check-In</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.lavenderMid} />
            <Text style={styles.loadingText}>Your WellnessGuide is here…</Text>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {checkin && (
          <>
            {checkin.streak > 0 && (
              <View style={styles.streakCard}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <View>
                  <Text style={styles.streakValue}>{checkin.streak} day streak</Text>
                  <Text style={styles.streakSub}>You're building a great habit!</Text>
                </View>
              </View>
            )}

            <View style={styles.messageCard}>
              <View style={styles.avatarRow}>
                <View style={styles.avatar}><Text style={{ fontSize: 18 }}>🧠</Text></View>
                <Text style={styles.avatarName}>WellnessGuide</Text>
              </View>
              <Text style={styles.message}>{checkin.message}</Text>
            </View>

            <View style={styles.resourcesCard}>
              <Text style={styles.resourcesTitle}>Quick Resources</Text>
              {[
                { icon: '💬', title: 'Free Counseling', sub: 'On-campus & virtual · available now' },
                { icon: '🧘', title: 'Breathing Exercise', sub: '5-minute guided session' },
                { icon: '📞', title: 'Crisis Hotline', sub: '988 — call or text anytime' },
              ].map((r, i) => (
                <TouchableOpacity key={i} style={styles.resourceRow}>
                  <View style={styles.resourceIcon}><Text style={{ fontSize: 18 }}>{r.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resourceTitle}>{r.title}</Text>
                    <Text style={styles.resourceSub}>{r.sub}</Text>
                  </View>
                  <Text style={{ color: Colors.textLight, fontSize: 18 }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={startCheckin}>
              <Text style={styles.refreshText}>↻ New Check-In</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.lavenderMid, padding: 24, paddingTop: 56, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 56, left: 16 },
  backText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  headerIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  content: { padding: 16, paddingBottom: 48 },
  emptyCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 28, ...Shadow.sm, alignItems: 'center', marginTop: 16 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  emptySub: { fontSize: 13.5, color: Colors.textMid, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  actionBtn: { backgroundColor: Colors.lavenderMid, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 28 },
  actionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  loadingCard: { alignItems: 'center', padding: 48, gap: 16 },
  loadingText: { color: Colors.textMid, fontSize: 14 },
  errorText: { color: Colors.terracotta, textAlign: 'center', marginTop: 16 },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 14 },
  streakEmoji: { fontSize: 36 },
  streakValue: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  streakSub: { fontSize: 12, color: Colors.textMid, marginTop: 2 },
  messageCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 20, ...Shadow.sm, marginBottom: 14 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.lavender, alignItems: 'center', justifyContent: 'center' },
  avatarName: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  message: { fontSize: 15, color: Colors.textDark, lineHeight: 24 },
  resourcesCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 14 },
  resourcesTitle: { fontSize: 13, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  resourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  resourceIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.lavender, alignItems: 'center', justifyContent: 'center' },
  resourceTitle: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  resourceSub: { fontSize: 12, color: Colors.textMid, marginTop: 1 },
  refreshBtn: { alignItems: 'center', padding: 14 },
  refreshText: { color: Colors.lavenderMid, fontWeight: '600', fontSize: 14 },
});
