import { Colors, Radius, Shadow } from '@/constants/theme';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ACCENT = '#C08A3A';
const ACCENT_BG = '#fdf3e3';

type AgentPhase = 'idle' | 'loading' | 'review' | 'submitting' | 'done' | 'error';

interface AgentState {
  phase: AgentPhase;
  opportunityName: string;
  url: string;
  result: any;
}

const AGENT_STATUS_MESSAGES = [
  'Navigating to application page…',
  'Reading form fields…',
  'Analyzing your profile…',
  'Mapping your information to fields…',
  'Filling out your application…',
  'Taking a screenshot for review…',
];

export default function FundFinderScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentState>({
    phase: 'idle', opportunityName: '', url: '', result: null,
  });
  const [agentStatusIdx, setAgentStatusIdx] = useState(0);

  const fetchFunding = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.searchFunding() as any;
      setPlan(result.financial_plan);
    } catch {
      setError('Could not load funding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startAutoApply = async (name: string, url: string) => {
    setAgent({ phase: 'loading', opportunityName: name, url, result: null });
    setAgentStatusIdx(0);

    const ticker = setInterval(() => {
      setAgentStatusIdx(i => Math.min(i + 1, AGENT_STATUS_MESSAGES.length - 1));
    }, 3500);

    try {
      const result = await api.autoApplyFundingPreview(url) as any;
      clearInterval(ticker);
      setAgent(prev => ({ ...prev, phase: 'review', result }));
    } catch (e: any) {
      clearInterval(ticker);
      setAgent(prev => ({ ...prev, phase: 'error', result: { error: e.message } }));
    }
  };

  const confirmSubmit = async () => {
    setAgent(prev => ({ ...prev, phase: 'submitting' }));
    try {
      const result = await api.autoApplyFundingSubmit(
        agent.url,
        agent.result?.filled_values ?? [],
      ) as any;
      setAgent(prev => ({ ...prev, phase: 'done', result }));
    } catch (e: any) {
      setAgent(prev => ({ ...prev, phase: 'error', result: { error: e.message } }));
    }
  };

  const closeAgent = () => setAgent({ phase: 'idle', opportunityName: '', url: '', result: null });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { backgroundColor: Colors.navy }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.sage, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.iconWrap, { backgroundColor: Colors.terraLight }]}>
            <Text style={{ fontSize: 28 }}>💰</Text>
          </View>
          <Text style={styles.headerTitle}>FundFinder Agent</Text>
          <Text style={styles.headerSub}>Grants, scholarships & aid · Auto-Apply enabled</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {!plan && !loading && (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>🔍</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 6 }}>
              Find Your Funding
            </Text>
            <Text style={{ fontSize: 13, color: Colors.textMid, textAlign: 'center', marginBottom: 20 }}>
              AI finds grants, scholarships, and aid matched to your profile — then auto-fills the applications for you.
            </Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: ACCENT }]} onPress={fetchFunding}>
              <Text style={{ color: Colors.white, fontWeight: '700', fontSize: 15 }}>Find My Funding →</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={{ marginTop: 16, color: Colors.textMid, fontSize: 14 }}>
              Scanning scholarships & grants matched to you…
            </Text>
          </View>
        )}

        {error && (
          <View style={[styles.card, { alignItems: 'center' }]}>
            <Text style={{ color: Colors.terracotta, fontSize: 14 }}>{error}</Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: ACCENT, marginTop: 12 }]} onPress={fetchFunding}>
              <Text style={{ color: Colors.white, fontWeight: '700' }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {plan && (
          <>
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

            {/* Scholarships — with Auto-Apply */}
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
                    {s.link && (
                      <TouchableOpacity
                        style={styles.autoApplyBtn}
                        onPress={() => startAutoApply(s.name, s.link)}
                      >
                        <Text style={styles.autoApplyBtnText}>🤖 Auto-Apply</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Grants — with Auto-Apply */}
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
                    {g.link && (
                      <TouchableOpacity
                        style={styles.autoApplyBtn}
                        onPress={() => startAutoApply(g.name, g.link)}
                      >
                        <Text style={styles.autoApplyBtnText}>🤖 Auto-Apply</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

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

            <TouchableOpacity style={[styles.btn, { backgroundColor: ACCENT, alignSelf: 'center' }]} onPress={fetchFunding}>
              <Text style={{ color: Colors.white, fontWeight: '700' }}>Refresh Results</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ── Autonomous Agent Modal ─────────────────────────────────────── */}
      <Modal visible={agent.phase !== 'idle'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>

            {/* Loading phase */}
            {agent.phase === 'loading' && (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <View style={styles.agentIconWrap}>
                  <Text style={{ fontSize: 30 }}>🤖</Text>
                </View>
                <Text style={styles.agentTitle}>Auto-Filling Application</Text>
                <Text style={styles.agentSubTitle}>{agent.opportunityName}</Text>
                <ActivityIndicator size="large" color={ACCENT} style={{ marginVertical: 20 }} />
                <Text style={styles.agentStatus}>{AGENT_STATUS_MESSAGES[agentStatusIdx]}</Text>
              </View>
            )}

            {/* Review phase */}
            {agent.phase === 'review' && agent.result && (
              <ScrollView>
                <View style={{ padding: 20 }}>
                  {agent.result.status === 'gate_detected' || agent.result.status === 'no_form' || agent.result.status === 'playwright_unavailable' ? (
                    // Fallback: Quick Answer Sheet
                    <>
                      <Text style={styles.agentTitle}>📋 Quick Answer Sheet</Text>
                      <Text style={styles.agentSubTitle}>{agent.result.message}</Text>
                      <View style={{ marginTop: 16 }}>
                        {Object.entries(agent.result.quick_answers || {}).map(([k, v]: any) => (
                          <View key={k} style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>{k}</Text>
                            <Text style={styles.fieldValue}>{String(v)}</Text>
                          </View>
                        ))}
                      </View>
                      <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.textLight, marginTop: 20 }]} onPress={closeAgent}>
                        <Text style={{ color: Colors.white, fontWeight: '700', textAlign: 'center' }}>Close</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    // Success: filled form preview
                    <>
                      <View style={styles.agentSuccessBadge}>
                        <Text style={styles.agentSuccessText}>✓ Form Filled — Ready to Submit</Text>
                      </View>
                      <Text style={styles.agentTitle}>Review Your Application</Text>
                      <Text style={[styles.agentSubTitle, { marginBottom: 16 }]}>
                        {agent.result.fields_filled} of {agent.result.fields_found} fields filled
                      </Text>
                      {(agent.result.filled_values || [])
                        .filter((fv: any) => fv.value)
                        .map((fv: any, i: number) => (
                          <View key={i} style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>{fv.name || fv.id || `Field ${i + 1}`}</Text>
                            <Text style={styles.fieldValue}>{String(fv.value)}</Text>
                          </View>
                        ))}
                      <View style={{ gap: 10, marginTop: 20 }}>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: ACCENT }]} onPress={confirmSubmit}>
                          <Text style={{ color: Colors.white, fontWeight: '700', textAlign: 'center', fontSize: 15 }}>
                            ✓ Confirm & Submit Application
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border }]} onPress={closeAgent}>
                          <Text style={{ color: Colors.textMid, fontWeight: '600', textAlign: 'center' }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </ScrollView>
            )}

            {/* Submitting phase */}
            {agent.phase === 'submitting' && (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <View style={styles.agentIconWrap}>
                  <Text style={{ fontSize: 30 }}>📤</Text>
                </View>
                <Text style={styles.agentTitle}>Submitting Application</Text>
                <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 20 }} />
                <Text style={styles.agentStatus}>Clicking submit and waiting for confirmation…</Text>
              </View>
            )}

            {/* Done phase */}
            {agent.phase === 'done' && (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <Text style={{ fontSize: 56, marginBottom: 12 }}>🎉</Text>
                <Text style={styles.agentTitle}>Application Submitted!</Text>
                <Text style={[styles.agentSubTitle, { textAlign: 'center', marginBottom: 24 }]}>
                  {agent.result?.message || 'Your application has been submitted successfully.'}
                </Text>
                <TouchableOpacity style={[styles.btn, { backgroundColor: ACCENT }]} onPress={closeAgent}>
                  <Text style={{ color: Colors.white, fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error phase */}
            {agent.phase === 'error' && (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>⚠️</Text>
                <Text style={styles.agentTitle}>Something Went Wrong</Text>
                <Text style={[styles.agentSubTitle, { textAlign: 'center', marginBottom: 24 }]}>
                  {agent.result?.error || 'The agent ran into an issue. Try applying manually.'}
                </Text>
                <TouchableOpacity style={[styles.btn, { backgroundColor: ACCENT }]} onPress={closeAgent}>
                  <Text style={{ color: Colors.white, fontWeight: '700' }}>Close</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
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
  autoApplyBtn: { marginTop: 10, backgroundColor: ACCENT_BG, borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start', borderWidth: 1, borderColor: ACCENT },
  autoApplyBtnText: { fontSize: 12, fontWeight: '700', color: ACCENT },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', minHeight: 300 },
  agentIconWrap: { width: 72, height: 72, borderRadius: 24, backgroundColor: ACCENT_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  agentTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 6, textAlign: 'center' },
  agentSubTitle: { fontSize: 13, color: Colors.textMid, textAlign: 'center' },
  agentStatus: { fontSize: 13, color: Colors.textMid, marginTop: 12, textAlign: 'center', fontStyle: 'italic' },
  agentSuccessBadge: { backgroundColor: '#e8f5e9', borderRadius: Radius.md, padding: 10, alignItems: 'center', marginBottom: 14 },
  agentSuccessText: { color: '#2e7d32', fontWeight: '700', fontSize: 13 },
  fieldRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  fieldLabel: { width: 130, fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  fieldValue: { flex: 1, fontSize: 12, color: Colors.textDark },
});
