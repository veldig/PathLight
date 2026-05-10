import { Colors, Radius, Shadow } from '@/constants/theme';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const MILESTONES = [
  { label: 'Complete FAFSA application', done: true, tag: 'FundFinder' },
  { label: 'Register for Spring semester', done: true, tag: 'EduPath' },
  { label: 'Apply for Student Parent Scholarship', done: false, tag: 'FundFinder' },
  { label: 'Submit resume to CareerBoost', done: false, tag: 'CareerBoost' },
  { label: 'Schedule therapy intake session', done: false, tag: 'Wellness' },
];

export default function PlanScreen() {
  const done = MILESTONES.filter((m) => m.done).length;
  const pct = Math.round((done / MILESTONES.length) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Plan</Text>
      <Text style={styles.sub}>Your personalized roadmap across all agents.</Text>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Overall Progress</Text>
          <Text style={styles.pct}>{pct}%</Text>
        </View>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${pct}%` as any }]} />
        </View>
        <Text style={styles.meta}>{done} of {MILESTONES.length} milestones complete</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Milestones</Text>
        {MILESTONES.map((m, i) => (
          <View key={i} style={[styles.milestone, i === MILESTONES.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[styles.check, m.done && styles.checkDone]}>
              {m.done && <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '700' }}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.milestoneLabel, m.done && styles.milestoneDone]}>{m.label}</Text>
              <Text style={styles.milestoneTag}>{m.tag}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  sub: { fontSize: 13.5, color: Colors.textMid, marginBottom: 18 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 16 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  pct: { fontSize: 15, fontWeight: '700', color: Colors.sage },
  bar: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 10, overflow: 'hidden', marginBottom: 8 },
  fill: { height: '100%', backgroundColor: Colors.sage, borderRadius: 10 },
  meta: { fontSize: 12, color: Colors.textMid },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: Colors.sage, borderColor: Colors.sage },
  milestoneLabel: { fontSize: 13.5, fontWeight: '600', color: Colors.textDark },
  milestoneDone: { color: Colors.textLight, textDecorationLine: 'line-through' },
  milestoneTag: { fontSize: 11, color: Colors.textMid, marginTop: 2 },
});
