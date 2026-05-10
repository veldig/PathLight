import AgentCard from '@/components/AgentCard';
import AxoChatbot from '@/components/AxoChatbot';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { useProfileStore } from '@/store/profileStore';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const AGENTS = [
  {
    id: 'edupath',
    name: 'FocusPath Agent',
    role: 'Detects your focus, rephrases tough content & switches between text, video or quiz — adapts to you in real time.',
    icon: '🎯',
    status: 'Attention mode: active',
    progress: 0.52,
    progressLabel: 'Modules mastered',
    progressRight: '4 / 7',
    color: '#C08A3A',
    bgColor: '#fdf3e3',
    action: 'Start Session',
    route: '/agents/focuspath',
  },
  {
    id: 'fundfinder',
    name: 'FundFinder Agent',
    role: 'Finds & auto-applies for grants, scholarships, and government aid you qualify for.',
    icon: '💰',
    status: '3 new matches found',
    progress: 0.45,
    progressLabel: 'Applications sent',
    progressRight: '9 / 20',
    color: Colors.terracotta,
    bgColor: Colors.terraLight,
    action: 'View Resources',
    route: '/agents/fundfinder',
  },
  {
    id: 'careerboost',
    name: 'CareerBoost Agent',
    role: 'Finds flexible jobs, writes cover letters, and applies on your behalf.',
    icon: '💼',
    status: '5 applications in progress',
    progress: 0.3,
    progressLabel: 'Profile strength',
    progressRight: '30%',
    color: Colors.navy,
    bgColor: '#e8eef7',
    action: 'Browse Jobs',
    route: '/agents/careerboost',
  },
  {
    id: 'wellness',
    name: 'WellnessGuide Agent',
    role: 'Daily mental health check-ins, therapist recommendations, and motivational support.',
    icon: '🧠',
    status: 'Check-in ready for today',
    progress: 0.8,
    progressLabel: 'Streak',
    progressRight: '12 days 🔥',
    color: Colors.lavenderMid,
    bgColor: Colors.lavender,
    action: 'Start Check-In',
    route: '/agents/wellness',
  },
] as const;

const THIS_WEEK = [
  { day: 'MON', title: 'Study Session: Psychology 101', sub: 'Adaptive · 10:00 AM – 11:30 AM', chip: 'FocusPath', chipBg: '#fdf3e3', chipColor: '#C08A3A' },
  { day: 'TUE', title: 'Job Application Deadline', sub: 'Target Corp · Remote', chip: 'CareerBoost', chipBg: '#e8eef7', chipColor: Colors.navy },
  { day: 'WED', title: 'Grant Confirmation Due', sub: 'Student Parent Scholarship', chip: 'FundFinder', chipBg: Colors.terraLight, chipColor: '#a04030' },
  { day: 'FRI', title: 'Therapy Session', sub: 'Dr. Ramos · 2:00 PM', chip: 'Wellness', chipBg: Colors.lavender, chipColor: '#5a4a90' },
];

const RECS = [
  { icon: '🏫', title: 'Childcare Assistance Program', desc: 'Local program · reduce childcare costs', bg: Colors.sageLight },
  { icon: '💵', title: 'Student Parent Scholarship', desc: 'Up to $2,500 · Apply by Friday', bg: Colors.terraLight },
  { icon: '💬', title: 'Free Mental Health Counseling', desc: 'On-campus & virtual · available now', bg: Colors.lavender },
];

export default function HomeScreen() {
  const router = useRouter();
  const { profile, load } = useProfileStore();

  useEffect(() => { load(); }, []);

  const firstName = profile?.name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}><Text style={{ fontSize: 18 }}>🌿</Text></View>
            <Text style={styles.logoText}>PathLight</Text>
          </View>
          <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
        </View>

        <Text style={styles.pageTitle}>{greeting}, {firstName} ☀️</Text>
        <Text style={styles.pageSub}>Here's your personalized overview. Your agents are working for you.</Text>

        {/* Agent cards 2-col grid */}
        <View style={styles.grid}>
          {AGENTS.map((a) => (
            <AgentCard key={a.id} {...a} onPress={() => router.push(a.route as any)} />
          ))}
        </View>

        {/* This week */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>This Week's Plan</Text>
            <Text style={styles.cardLink}>View All</Text>
          </View>
          {THIS_WEEK.map((item, i) => (
            <View key={i} style={[styles.weekItem, i === THIS_WEEK.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.weekDay}>{item.day}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.weekTitle}>{item.title}</Text>
                <Text style={styles.weekSub}>{item.sub}</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: item.chipBg }]}>
                <Text style={[styles.chipText, { color: item.chipColor }]}>{item.chip}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recommendations */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Recommended For You</Text>
            <Text style={styles.cardLink}>View All</Text>
          </View>
          {RECS.map((r, i) => (
            <TouchableOpacity key={i} style={styles.recItem}>
              <View style={[styles.recIcon, { backgroundColor: r.bg }]}>
                <Text style={{ fontSize: 18 }}>{r.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recTitle}>{r.title}</Text>
                <Text style={styles.recDesc}>{r.desc}</Text>
              </View>
              <Text style={styles.recArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <AxoChatbot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 100 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.sage, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, fontWeight: '700', color: Colors.navy },
  greeting: { fontSize: 13, color: Colors.textMid, fontWeight: '500' },
  pageTitle: { fontSize: 24, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  pageSub: { fontSize: 13.5, color: Colors.textMid, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 16 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  cardLink: { fontSize: 12, color: Colors.sage, fontWeight: '500' },
  weekItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  weekDay: { fontSize: 11, fontWeight: '700', color: Colors.textLight, width: 34 },
  weekTitle: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  weekSub: { fontSize: 11, color: Colors.textLight, marginTop: 1 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 10, fontWeight: '700' },
  recItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, backgroundColor: Colors.cream, borderRadius: Radius.md, marginBottom: 8 },
  recIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recTitle: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  recDesc: { fontSize: 11, color: Colors.textMid, marginTop: 1 },
  recArrow: { fontSize: 18, color: Colors.textLight, marginLeft: 'auto' },
});
