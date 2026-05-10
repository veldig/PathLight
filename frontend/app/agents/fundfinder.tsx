import { Colors, Radius, Shadow } from '@/constants/theme';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Opportunity {
  id: string;
  name: string;
  source: string;
  amount: number;
  deadline: string;
  match_score: number;
  description: string;
  requirements: string[];
  status: string;
}

export default function FundFinderScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setError('');
    try {
      const result = await api.searchFunding();
      const raw = (result as any).opportunities;
      const parsed = typeof raw === 'string'
        ? JSON.parse(raw.replace(/```json|```/g, '').trim())
        : raw;
      setOpportunities(Array.isArray(parsed) ? parsed : []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function apply(opp: Opportunity) {
    const confirmed = window?.confirm
      ? window.confirm(`Apply to "${opp.name}"?`)
      : await new Promise<boolean>((resolve) =>
          Alert.alert('Confirm Application', `Apply to ${opp.name}?`, [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Apply', onPress: () => resolve(true) },
          ])
        );
    if (!confirmed) return;
    setApplying(opp.id);
    try {
      await api.confirmFundingApplication(opp.id);
      setOpportunities((prev) => prev.map((o) => o.id === opp.id ? { ...o, status: 'submitted' } : o));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setApplying(null);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerIcon}><Text style={{ fontSize: 22 }}>💰</Text></View>
        <Text style={styles.headerTitle}>FundFinder Agent</Text>
        <Text style={styles.headerSub}>Grants, scholarships & aid you qualify for</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {opportunities.length === 0 && !loading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Find funding for you</Text>
            <Text style={styles.emptySub}>FundFinder scans thousands of grants, scholarships, and government programs based on your profile.</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={search}>
              <Text style={styles.actionBtnText}>Search Funding Opportunities</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.terracotta} />
            <Text style={styles.loadingText}>Scanning funding sources for you…</Text>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {opportunities.map((opp) => (
          <View key={opp.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.oppName}>{opp.name}</Text>
                <Text style={styles.oppSource}>{opp.source}</Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchText}>{Math.round(opp.match_score * 100)}% match</Text>
              </View>
            </View>

            <Text style={styles.amount}>${opp.amount.toLocaleString()}</Text>
            <Text style={styles.deadline}>Deadline: {opp.deadline}</Text>
            <Text style={styles.description}>{opp.description}</Text>

            {opp.requirements?.length > 0 && (
              <View style={styles.reqSection}>
                <Text style={styles.reqTitle}>Requirements</Text>
                {opp.requirements.map((r, i) => (
                  <View key={i} style={styles.listRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.listText}>{r}</Text>
                  </View>
                ))}
              </View>
            )}

            {opp.status === 'submitted' ? (
              <View style={styles.submittedBadge}>
                <Text style={styles.submittedText}>✓ Application Submitted</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.applyBtn, applying === opp.id && { opacity: 0.6 }]}
                onPress={() => apply(opp)}
                disabled={applying === opp.id}
              >
                {applying === opp.id
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.applyBtnText}>Apply Now →</Text>}
              </TouchableOpacity>
            )}
          </View>
        ))}

        {opportunities.length > 0 && (
          <TouchableOpacity style={styles.refreshBtn} onPress={search}>
            <Text style={styles.refreshText}>↻ Search Again</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.terracotta, padding: 24, paddingTop: 56, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 56, left: 16 },
  backText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  headerIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  content: { padding: 16, paddingBottom: 48 },
  emptyCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 28, ...Shadow.sm, alignItems: 'center', marginTop: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  emptySub: { fontSize: 13.5, color: Colors.textMid, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  actionBtn: { backgroundColor: Colors.terracotta, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 28 },
  actionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  loadingCard: { alignItems: 'center', padding: 48, gap: 16 },
  loadingText: { color: Colors.textMid, fontSize: 14 },
  errorText: { color: Colors.terracotta, textAlign: 'center', marginTop: 16 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  oppName: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  oppSource: { fontSize: 12, color: Colors.textMid },
  matchBadge: { backgroundColor: Colors.terraLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  matchText: { fontSize: 11, fontWeight: '700', color: Colors.terracotta },
  amount: { fontSize: 24, fontWeight: '700', color: Colors.terracotta, marginBottom: 4 },
  deadline: { fontSize: 12, color: Colors.textMid, marginBottom: 10 },
  description: { fontSize: 13, color: Colors.textDark, lineHeight: 19, marginBottom: 12 },
  reqSection: { marginBottom: 14 },
  reqTitle: { fontSize: 11, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', marginBottom: 8 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.terracotta, marginTop: 6 },
  listText: { flex: 1, fontSize: 13, color: Colors.textDark },
  applyBtn: { backgroundColor: Colors.terracotta, borderRadius: Radius.md, padding: 13, alignItems: 'center' },
  applyBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  submittedBadge: { backgroundColor: Colors.sageLight, borderRadius: Radius.md, padding: 12, alignItems: 'center' },
  submittedText: { color: '#3a7a50', fontWeight: '700', fontSize: 14 },
  refreshBtn: { alignItems: 'center', padding: 14 },
  refreshText: { color: Colors.terracotta, fontWeight: '600', fontSize: 14 },
});
