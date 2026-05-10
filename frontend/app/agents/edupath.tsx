import { Colors, Radius, Shadow } from '@/constants/theme';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function EduPathScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState('');

  async function analyze() {
    setLoading(true);
    setError('');
    try {
      const result = await api.analyzeEducation();
      const parsed = typeof (result as any).plan === 'string'
        ? JSON.parse((result as any).plan.replace(/```json|```/g, '').trim())
        : (result as any).plan;
      setPlan(parsed);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerIcon}><Text style={{ fontSize: 22 }}>📚</Text></View>
        <Text style={styles.headerTitle}>EduPath Agent</Text>
        <Text style={styles.headerSub}>Your personalized education roadmap</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!plan && !loading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Ready to build your plan?</Text>
            <Text style={styles.emptySub}>EduPath will analyze your profile and create a personalized degree roadmap — courses, schedule, and milestones.</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={analyze}>
              <Text style={styles.actionBtnText}>Generate My Education Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.sage} />
            <Text style={styles.loadingText}>Building your personalized roadmap…</Text>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {plan && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎓 Degree Target</Text>
              <Text style={styles.bigValue}>{plan.degree_target}</Text>
              <Text style={styles.metaText}>Estimated {plan.estimated_months} months to complete</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 Weekly Schedule</Text>
              {(plan.weekly_schedule ?? []).map((s: string, i: number) => (
                <View key={i} style={styles.listRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.listText}>{s}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📖 Recommended Courses</Text>
              {(plan.recommended_courses ?? []).map((c: any, i: number) => (
                <View key={i} style={[styles.courseRow, i === plan.recommended_courses.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courseName}>{c.name}</Text>
                    <Text style={styles.courseMeta}>{c.credits} credits · {c.online ? '🌐 Online' : '🏫 In-person'}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={analyze}>
              <Text style={styles.refreshText}>↻ Regenerate Plan</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.sage, padding: 24, paddingTop: 56, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 56, left: 16 },
  backText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  headerIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  content: { padding: 16, paddingBottom: 48 },
  emptyCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 28, ...Shadow.sm, alignItems: 'center', marginTop: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  emptySub: { fontSize: 13.5, color: Colors.textMid, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  actionBtn: { backgroundColor: Colors.sage, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 28 },
  actionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  loadingCard: { alignItems: 'center', padding: 48, gap: 16 },
  loadingText: { color: Colors.textMid, fontSize: 14 },
  errorText: { color: Colors.terracotta, textAlign: 'center', marginTop: 16 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  bigValue: { fontSize: 20, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  metaText: { fontSize: 13, color: Colors.textMid },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  bullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.sage, marginTop: 5 },
  listText: { flex: 1, fontSize: 13.5, color: Colors.textDark, lineHeight: 20 },
  courseRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  courseName: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  courseMeta: { fontSize: 12, color: Colors.textMid, marginTop: 2 },
  refreshBtn: { alignItems: 'center', padding: 14 },
  refreshText: { color: Colors.sage, fontWeight: '600', fontSize: 14 },
});
