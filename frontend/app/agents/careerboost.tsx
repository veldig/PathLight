import { Colors, Radius, Shadow } from '@/constants/theme';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
}

export default function CareerBoostScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState<string | null>(null);

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

  async function apply(job: Job) {
    const confirmed = window?.confirm
      ? window.confirm(`Apply to "${job.title}" at ${job.company}?`)
      : await new Promise<boolean>((resolve) =>
          Alert.alert('Apply for Job', `Submit application for ${job.title}?`, [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Apply', onPress: () => resolve(true) },
          ])
        );
    if (!confirmed) return;
    setApplying(job.id);
    try {
      await api.confirmJobApplication(job.id);
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: 'applied' } : j));
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
        <View style={styles.headerIcon}><Text style={{ fontSize: 22 }}>💼</Text></View>
        <Text style={styles.headerTitle}>CareerBoost Agent</Text>
        <Text style={styles.headerSub}>Flexible jobs matched to your life</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {jobs.length === 0 && !loading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Find your next opportunity</Text>
            <Text style={styles.emptySub}>CareerBoost finds flexible, remote-friendly jobs that fit around your schedule and family needs.</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={search}>
              <Text style={styles.actionBtnText}>Search Jobs For Me</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.navy} />
            <Text style={styles.loadingText}>Finding flexible opportunities…</Text>
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
              <TouchableOpacity
                style={[styles.applyBtn, applying === job.id && { opacity: 0.6 }]}
                onPress={() => apply(job)}
                disabled={applying === job.id}
              >
                {applying === job.id
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.applyBtnText}>Apply Now →</Text>}
              </TouchableOpacity>
            )}
          </View>
        ))}

        {jobs.length > 0 && (
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
  actionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
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
  applyBtn: { backgroundColor: Colors.navy, borderRadius: Radius.md, padding: 13, alignItems: 'center' },
  applyBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  appliedBadge: { backgroundColor: Colors.sageLight, borderRadius: Radius.md, padding: 12, alignItems: 'center' },
  appliedText: { color: '#3a7a50', fontWeight: '700', fontSize: 14 },
  refreshBtn: { alignItems: 'center', padding: 14 },
  refreshText: { color: Colors.navy, fontWeight: '600', fontSize: 14 },
});
