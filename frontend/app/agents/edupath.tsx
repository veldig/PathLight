import { Colors, Radius, Shadow } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ACCENT = '#C08A3A';
const ACCENT_BG = '#fdf3e3';

const MODULES = [
  { title: 'Introduction to Psychology', format: 'Video', done: true, time: '18 min' },
  { title: 'Memory & Learning Theories', format: 'Quiz', done: true, time: '12 min' },
  { title: 'Cognitive Development', format: 'Text', done: true, time: '22 min' },
  { title: 'Attention & Focus Models', format: 'Video', done: true, time: '15 min' },
  { title: 'Social Influence & Behavior', format: 'Text', done: false, time: '20 min' },
  { title: 'Emotion & Motivation', format: 'Quiz', done: false, time: '14 min' },
  { title: 'Final Review', format: 'Adaptive', done: false, time: '30 min' },
];

const FORMAT_ICONS: Record<string, string> = {
  Video: '🎬',
  Quiz: '✏️',
  Text: '📄',
  Adaptive: '🔀',
};

const HINTS = [
  { icon: '🎙️', title: 'Voice Mode', desc: 'Hands-free learning while caring for your little one' },
  { icon: '🔀', title: 'Auto-adapt', desc: 'Switches format when your focus dips — text → video → quiz' },
  { icon: '✨', title: 'AI Rephrase', desc: 'Tap any concept to get a simpler explanation instantly' },
];

export default function FocusPathScreen() {
  const router = useRouter();
  const done = MODULES.filter((m) => m.done).length;
  const pct = Math.round((done / MODULES.length) * 100);
  const next = MODULES.find((m) => !m.done);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.iconWrap}>
            <Text style={{ fontSize: 28 }}>🎯</Text>
          </View>
          <Text style={styles.headerTitle}>FocusPath Agent</Text>
          <Text style={styles.headerSub}>Adaptive learning companion</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress card */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Course Progress</Text>
            <Text style={[styles.pct, { color: ACCENT }]}>{pct}%</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.meta}>{done} of {MODULES.length} modules complete</Text>

          {/* Attention badge */}
          <View style={[styles.attentionBadge, { backgroundColor: ACCENT_BG }]}>
            <View style={[styles.dot, { backgroundColor: ACCENT }]} />
            <Text style={[styles.attentionText, { color: ACCENT }]}>Attention mode: active — adapting content to your focus</Text>
          </View>
        </View>

        {/* Next up CTA */}
        {next && (
          <TouchableOpacity style={[styles.nextCard, { borderLeftColor: ACCENT }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>Up Next</Text>
              <Text style={styles.nextTitle}>{next.title}</Text>
              <Text style={styles.nextMeta}>{FORMAT_ICONS[next.format]} {next.format} · {next.time}</Text>
            </View>
            <View style={[styles.startBtn, { backgroundColor: ACCENT }]}>
              <Text style={styles.startText}>Start →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Features */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How FocusPath Helps You</Text>
          {HINTS.map((h, i) => (
            <View key={i} style={[styles.hintRow, i === HINTS.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.hintIcon, { backgroundColor: ACCENT_BG }]}>
                <Text style={{ fontSize: 18 }}>{h.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hintTitle}>{h.title}</Text>
                <Text style={styles.hintDesc}>{h.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Module list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>All Modules</Text>
          {MODULES.map((m, i) => (
            <View key={i} style={[styles.module, i === MODULES.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.check, m.done && { backgroundColor: ACCENT, borderColor: ACCENT }]}>
                {m.done && <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '700' }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.moduleTitle, m.done && styles.moduleDone]}>{m.title}</Text>
                <Text style={styles.moduleMeta}>{FORMAT_ICONS[m.format]} {m.format} · {m.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.navy, paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 },
  backBtn: { marginBottom: 16 },
  backText: { color: Colors.sage, fontSize: 16, fontWeight: '600' },
  headerContent: { alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: ACCENT_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: Colors.textLight },
  content: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  pct: { fontSize: 15, fontWeight: '700' },
  bar: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 10, overflow: 'hidden', marginBottom: 8 },
  fill: { height: '100%', backgroundColor: ACCENT, borderRadius: 10 },
  meta: { fontSize: 12, color: Colors.textMid, marginBottom: 12 },
  attentionBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  attentionText: { fontSize: 12, fontWeight: '600', flex: 1 },
  nextCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 14, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, gap: 12 },
  nextLabel: { fontSize: 10, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  nextTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  nextMeta: { fontSize: 12, color: Colors.textMid },
  startBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  startText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  hintIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hintTitle: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  hintDesc: { fontSize: 12, color: Colors.textMid, marginTop: 2 },
  module: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  moduleTitle: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  moduleDone: { color: Colors.textLight, textDecorationLine: 'line-through' },
  moduleMeta: { fontSize: 11, color: Colors.textMid, marginTop: 2 },
});
