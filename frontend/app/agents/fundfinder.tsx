import { Colors, Radius, Shadow } from '@/constants/theme';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ACCENT = '#C08A3A';
const ACCENT_BG = '#fdf3e3';

export default function FundFinderScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFunding = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.searchFunding() as any;
      setPlan(result.financial_plan);
    } catch (e: any) {
      setError('Could not load funding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors.navy }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.sage, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.iconWrap, { backgroundColor: Colors.terraLight }]}>
            <Text style={{ fontSize: 28 }}>💰</Text>
          </View>
          <Text style={styles.headerTitle}>FundFinder Agent</Text>
          <Text style={styles.headerSub}>Grants, scholarships & aid</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Find Button */}
        {!plan && !loading && (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>🔍</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 6 }}>
              Find Your Funding
            </Text>
            <Text style={{ fontSize: 13, color: Colors.textMid, textAlign: 'center', marginBottom: 20 }}>
              We'll find scholarships, grants, jobs, and childcare aid personalized for you.
            </Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: ACCENT }]} onPress={fetchFunding}>
              <Text style={{ color: Colors.white, fontWeight: '700', fontSize: 15 }}>Find My Funding →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={{ marginTop: 16, color: Colors.textMid, fontSize: 14 }}>
              Finding your personalized funding...
            </Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={[styles.card, { alignItems: 'center' }]}>
            <Text style={{ color: Colors.terracotta, fontSize: 14 }}>{error}</Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: ACCENT, marginTop: 12 }]} onPress={fetchFunding}>
              <Text style={{ color: Colors.white, fontWeight: '700' }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {plan && (
          <>
            {/* Summary */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Your Situation</Text>
                <View style={[styles.badge, { backgroundColor: plan.urgency === 'HIGH' ? '#fde8e8' : ACCENT_BG }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: plan.urgency === 'HIGH' ? '#c0392b' : ACCENT }}>
                    {plan.urgency} PRIORITY
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: Colors.textMid, lineHeight: 20 }}>{plan.summary}</Text>
            </View>

            {/* Budget Breakdown */}
            {plan.monthly_budget_breakdown && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Monthly Budget Breakdown</Text>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Income Potential</Text>
                  <Text style={[styles.budgetValue, { color: '#27ae60' }]}>{plan.monthly_budget_breakdown.income_potential}</Text>
                </View>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Aid Potential</Text>
                  <Text style={[styles.budgetValue, { color: ACCENT }]}>{plan.monthly_budget_breakdown.aid_potential}</Text>
                </View>
                <View style={[styles.budgetRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.budgetLabel}>Gap</Text>
                  <Text style={[styles.budgetValue, { color: Colors.textDark }]}>{plan.monthly_budget_breakdown.gap}</Text>
                </View>
                <Text style={{ fontSize: 12, color: Colors.textMid, marginTop: 8 }}>{plan.monthly_budget_breakdown.note}</Text>
              </View>
            )}

            {/* Next Steps */}
            {plan.immediate_next_steps?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>⚡ Immediate Next Steps</Text>
                {plan.immediate_next_steps.map((step: string, i: number) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={[styles.stepNum, { backgroundColor: ACCENT_BG }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: ACCENT }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, color: Colors.textMid, lineHeight: 18 }}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Scholarships */}
            {plan.scholarships?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🎓 Scholarships</Text>
                {plan.scholarships.map((s: any, i: number) => (
                  <View key={i} style={[styles.itemRow, i === plan.scholarships.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.textDark, flex: 1 }}>{s.name}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>{s.amount}</Text>
                    </View>
                    <Text style={styles.itemMeta}>📅 {s.deadline}</Text>
                    <Text style={styles.itemDesc}>{s.why_they_qualify}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Grants */}
            {plan.grants?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>💵 Grants</Text>
                {plan.grants.map((g: any, i: number) => (
                  <View key={i} style={[styles.itemRow, i === plan.grants.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.textDark, flex: 1 }}>{g.name}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>{g.amount}</Text>
                    </View>
                    <Text style={styles.itemDesc}>{g.why_they_qualify}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Jobs */}
            {plan.jobs?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>💼 Jobs That Fit Your Schedule</Text>
                {plan.jobs.map((j: any, i: number) => (
                  <View key={i} style={[styles.itemRow, i === plan.jobs.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.textDark, flex: 1 }}>{j.title}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>{j.pay}</Text>
                    </View>
                    <Text style={styles.itemMeta}>⏰ {j.hours}</Text>
                    <Text style={styles.itemDesc}>{j.why_it_fits}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Childcare */}
            {plan.childcare_assistance?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>👶 Childcare Assistance</Text>
                {plan.childcare_assistance.map((c: any, i: number) => (
                  <View key={i} style={[styles.itemRow, i === plan.childcare_assistance.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 4 }}>{c.program}</Text>
                    <Text style={styles.itemDesc}>{c.benefit}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Emergency Aid */}
            {plan.emergency_aid?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🚨 Emergency Aid</Text>
                {plan.emergency_aid.map((e: any, i: number) => (
                  <View key={i} style={[styles.itemRow, i === plan.emergency_aid.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.textDark, flex: 1 }}>{e.source}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.terracotta }}>{e.amount}</Text>
                    </View>
                    <Text style={styles.itemDesc}>{e.when_to_use}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Refresh */}
            <TouchableOpacity style={[styles.btn, { backgroundColor: ACCENT, alignSelf: 'center' }]} onPress={fetchFunding}>
              <Text style={{ color: Colors.white, fontWeight: '700' }}>Refresh Results</Text>
            </TouchableOpacity>
          </>
        )}
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  btn: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: Radius.md },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  budgetLabel: { fontSize: 13, color: Colors.textMid },
  budgetValue: { fontSize: 13, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  itemRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemMeta: { fontSize: 11, color: Colors.textLight, marginBottom: 4 },
  itemDesc: { fontSize: 12, color: Colors.textMid, lineHeight: 17 },
});