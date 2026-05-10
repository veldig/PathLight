import { Colors, Radius, Shadow } from '@/constants/theme';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Job {
  id: string;
  title: string;
  company: string;
  remote: boolean;
  childcare_benefits: boolean;
  salary_range: string;
  match_score: number;
  description: string;
  status: string;
  url?: string;
}

type AgentPhase = 'idle' | 'loading' | 'review' | 'submitting' | 'done' | 'error';

interface AgentState {
  phase: AgentPhase;
  jobTitle: string;
  url: string;
  result: any;
}

const AGENT_STATUS_MESSAGES = [
  'Navigating to job application page…',
  'Reading application form fields…',
  'Analyzing your skills and profile…',
  'Matching your experience to requirements…',
  'Filling out your job application…',
  'Taking a screenshot for your review…',
];

export default function CareerBoostScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentState>({
    phase: 'idle', jobTitle: '', url: '', result: null,
  });
  const [agentStatusIdx, setAgentStatusIdx] = useState(0);

  async function search() {
    setLoading(true);
    setError('');
    try {
      const result = await api.searchJobs();
      const raw = (result as any).jobs;
      const parsed = typeof raw === 'string'
        ? JSON.parse(raw.replace(/```json|```/g, '').trim())
        : raw;
      setJobs(Array.isArray(parsed) ? parsed : []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function manualApply(job: Job) {
    const confirmed = window?.confirm
      ? window.confirm(`Apply to "${job.title}" at ${job.company}?`)
      : await new Promise<boolean>((resolve) => {
          resolve(true);
        });
    if (!confirmed) return;
    setApplying(job.id);
    try {
      await api.confirmJobApplication(job.id);
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: 'applied' } : j));
    } catch (e: any) {
      setError(e.message);
    }
    setApplying(null);
  }

  const startAutoApply = async (job: Job) => {
    const url = job.url || '';
    if (!url) {
      setError('This job listing does not have a direct application link.');
      return;
    }
    setAgent({ phase: 'loading', jobTitle: `${job.title} at ${job.company}`, url, result: null });
    setAgentStatusIdx(0);

    const ticker = setInterval(() => {
      setAgentStatusIdx(i => Math.min(i + 1, AGENT_STATUS_MESSAGES.length - 1));
    }, 3500);

    try {
      const result = await api.autoApplyJobPreview(url) as any;
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
      const result = await api.autoApplyJobSubmit(
        agent.url,
        agent.result?.filled_values ?? [],
      ) as any;
      setJobs(prev => prev.map(j =>
        `${j.title} at ${j.company}` === agent.jobTitle ? { ...j, status: 'applied' } : j
      ));
      setAgent(prev => ({ ...prev, phase: 'done', result }));
    } catch (e: any) {
      setAgent(prev => ({ ...prev, phase: 'error', result: { error: e.message } }));
    }
  };

  const closeAgent = () => setAgent({ phase: 'idle', jobTitle: '', url: '', result: null });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerIcon}><Text style={{ fontSize: 22 }}>💼</Text></View>
        <Text style={styles.headerTitle}>CareerBoost Agent</Text>
        <Text style={styles.headerSub}>Flexible jobs · Auto-Apply enabled</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {jobs.length === 0 && !loading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Find your next opportunity</Text>
            <Text style={styles.emptySub}>
              CareerBoost finds remote-friendly jobs matched to your skills — then auto-fills and submits applications for you.
            </Text>
            <TouchableOpacity style={styles.actionBtn} onPress={search}>
              <Text style={styles.actionBtnText}>Search Jobs For Me</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.navy} />
            <Text style={styles.loadingText}>Finding flexible opportunities matched to you…</Text>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {jobs.map((job) => (
          <View key={job.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.company}>{job.company}</Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchText}>{Math.round(job.match_score * 100)}% match</Text>
              </View>
            </View>

            <Text style={styles.salary}>{job.salary_range}</Text>

            <View style={styles.tags}>
              {job.remote && <View style={styles.tag}><Text style={styles.tagText}>🌐 Remote</Text></View>}
              {job.childcare_benefits && <View style={styles.tag}><Text style={styles.tagText}>👶 Childcare benefits</Text></View>}
            </View>

            <Text style={styles.description}>{job.description}</Text>

            {job.status === 'applied' ? (
              <View style={styles.appliedBadge}>
                <Text style={styles.appliedText}>✓ Application Submitted</Text>
              </View>
            ) : (
              <View style={styles.applyRow}>
                {/* Auto-Apply (primary) */}
                <TouchableOpacity
                  style={[styles.autoApplyBtn, applying === job.id && { opacity: 0.6 }]}
                  onPress={() => startAutoApply(job)}
                  disabled={applying === job.id}
                >
                  <Text style={styles.autoApplyBtnText}>🤖 Auto-Apply</Text>
                </TouchableOpacity>

                {/* Manual fallback */}
                <TouchableOpacity
                  style={[styles.manualBtn, applying === job.id && { opacity: 0.6 }]}
                  onPress={() => manualApply(job)}
                  disabled={applying === job.id}
                >
                  {applying === job.id
                    ? <ActivityIndicator color={Colors.navy} size="small" />
                    : <Text style={styles.manualBtnText}>Apply Manually</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {jobs.length > 0 && (
          <TouchableOpacity style={styles.refreshBtn} onPress={search}>
            <Text style={styles.refreshText}>↻ Search Again</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Autonomous Agent Modal ─────────────────────────────────────── */}
      <Modal visible={agent.phase !== 'idle'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>

            {agent.phase === 'loading' && (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <View style={styles.agentIconWrap}>
                  <Text style={{ fontSize: 30 }}>🤖</Text>
                </View>
                <Text style={styles.agentTitle}>Auto-Filling Application</Text>
                <Text style={styles.agentSubTitle}>{agent.jobTitle}</Text>
                <ActivityIndicator size="large" color={Colors.navy} style={{ marginVertical: 20 }} />
                <Text style={styles.agentStatus}>{AGENT_STATUS_MESSAGES[agentStatusIdx]}</Text>
              </View>
            )}

            {agent.phase === 'review' && agent.result && (
              <ScrollView>
                <View style={{ padding: 20 }}>
                  {agent.result.status === 'gate_detected' || agent.result.status === 'no_form' || agent.result.status === 'playwright_unavailable' ? (
                    <>
                      <Text style={styles.agentTitle}>📋 Quick Answer Sheet</Text>
                      <Text style={[styles.agentSubTitle, { marginBottom: 16 }]}>{agent.result.message}</Text>
                      {Object.entries(agent.result.quick_answers || {}).map(([k, v]: any) => (
                        <View key={k} style={styles.fieldRow}>
                          <Text style={styles.fieldLabel}>{k}</Text>
                          <Text style={styles.fieldValue}>{String(v)}</Text>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={[styles.actionBtn, { marginTop: 20 }]}
                        onPress={() => Linking.openURL(agent.url)}
                      >
                        <Text style={styles.actionBtnText}>Open Application Page →</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.manualBtn, { marginTop: 10, paddingVertical: 14 }]} onPress={closeAgent}>
                        <Text style={styles.manualBtnText}>Close</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={styles.successBadge}>
                        <Text style={styles.successText}>✓ Form Filled — Ready to Submit</Text>
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
                        <TouchableOpacity style={styles.autoApplyBtn} onPress={confirmSubmit}>
                          <Text style={[styles.autoApplyBtnText, { fontSize: 15 }]}>
                            ✓ Confirm & Submit Application
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.manualBtn, { paddingVertical: 14 }]}
                          onPress={closeAgent}
                        >
                          <Text style={styles.manualBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </ScrollView>
            )}

            {agent.phase === 'submitting' && (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <View style={styles.agentIconWrap}>
                  <Text style={{ fontSize: 30 }}>📤</Text>
                </View>
                <Text style={styles.agentTitle}>Submitting Application</Text>
                <ActivityIndicator size="large" color={Colors.navy} style={{ marginTop: 20 }} />
                <Text style={styles.agentStatus}>Clicking submit and waiting for confirmation…</Text>
              </View>
            )}

            {agent.phase === 'done' && (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <Text style={{ fontSize: 56, marginBottom: 12 }}>🎉</Text>
                <Text style={styles.agentTitle}>Application Submitted!</Text>
                <Text style={[styles.agentSubTitle, { textAlign: 'center', marginBottom: 24 }]}>
                  {agent.result?.message || 'Your job application has been submitted successfully.'}
                </Text>
                <TouchableOpacity style={styles.autoApplyBtn} onPress={closeAgent}>
                  <Text style={styles.autoApplyBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {agent.phase === 'error' && (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>⚠️</Text>
                <Text style={styles.agentTitle}>Something Went Wrong</Text>
                <Text style={[styles.agentSubTitle, { textAlign: 'center', marginBottom: 24 }]}>
                  {agent.result?.error || 'The agent ran into an issue. Try applying manually.'}
                </Text>
                <TouchableOpacity style={styles.actionBtn} onPress={closeAgent}>
                  <Text style={styles.actionBtnText}>Close</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.navy, padding: 24, paddingTop: 56, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 56, left: 16 },
  backText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  headerIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  content: { padding: 16, paddingBottom: 48 },
  emptyCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 28, ...Shadow.sm, alignItems: 'center', marginTop: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  emptySub: { fontSize: 13.5, color: Colors.textMid, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  actionBtn: { backgroundColor: Colors.navy, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 28 },
  actionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  loadingCard: { alignItems: 'center', padding: 48, gap: 16 },
  loadingText: { color: Colors.textMid, fontSize: 14 },
  errorText: { color: Colors.terracotta, textAlign: 'center', marginTop: 16 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  jobTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  company: { fontSize: 13, color: Colors.textMid },
  matchBadge: { backgroundColor: '#e8eef7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  matchText: { fontSize: 11, fontWeight: '700', color: Colors.navy },
  salary: { fontSize: 18, fontWeight: '700', color: Colors.navy, marginBottom: 10 },
  tags: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  tag: { backgroundColor: Colors.cream, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  tagText: { fontSize: 11, color: Colors.textMid, fontWeight: '600' },
  description: { fontSize: 13, color: Colors.textDark, lineHeight: 19, marginBottom: 14 },
  applyRow: { flexDirection: 'row', gap: 10 },
  autoApplyBtn: { flex: 1, backgroundColor: Colors.navy, borderRadius: Radius.md, padding: 13, alignItems: 'center' },
  autoApplyBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14, textAlign: 'center' },
  manualBtn: { flex: 1, borderRadius: Radius.md, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: Colors.navy },
  manualBtnText: { color: Colors.navy, fontWeight: '600', fontSize: 13 },
  appliedBadge: { backgroundColor: Colors.sageLight, borderRadius: Radius.md, padding: 12, alignItems: 'center' },
  appliedText: { color: '#3a7a50', fontWeight: '700', fontSize: 14 },
  refreshBtn: { alignItems: 'center', padding: 14 },
  refreshText: { color: Colors.navy, fontWeight: '600', fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', minHeight: 300 },
  agentIconWrap: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#e8eef7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  agentTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 6, textAlign: 'center' },
  agentSubTitle: { fontSize: 13, color: Colors.textMid, textAlign: 'center' },
  agentStatus: { fontSize: 13, color: Colors.textMid, marginTop: 12, textAlign: 'center', fontStyle: 'italic' },
  successBadge: { backgroundColor: '#e8f5e9', borderRadius: Radius.md, padding: 10, alignItems: 'center', marginBottom: 14 },
  successText: { color: '#2e7d32', fontWeight: '700', fontSize: 13 },
  fieldRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  fieldLabel: { width: 130, fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  fieldValue: { flex: 1, fontSize: 12, color: Colors.textDark },
});
