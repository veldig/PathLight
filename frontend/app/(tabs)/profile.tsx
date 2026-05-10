import { Colors, Radius, Shadow } from '@/constants/theme';
import { changePassword, signOut } from '@/lib/profileService';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { profile, loading, load, save } = useProfileStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<typeof profile>(null);
  const [saving, setSaving] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);

  useEffect(() => { load(); }, []);

  function startEdit() {
    setDraft(profile ? { ...profile } : {
      id: user?.id ?? '',
      name: '',
      state: '',
      income_bracket: '',
      family_size: 0,
      child_ages: [],
      education_level: '',
      field_of_study: '',
      skills: [],
      hours_per_week: 0,
      childcare_needed: false,
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!draft) return;
    setSaving(true);
    try {
      await save(draft);
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Save failed', e.message);
    }
    setSaving(false);
  }

  function update(key: string, value: any) {
    setDraft((d: any) => d ? { ...d, [key]: value } : d);
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const data = editing ? draft : profile;
  const initials = (profile?.name ?? user?.email ?? 'U').slice(0, 2).toUpperCase();

  if (loading && !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {/* Avatar + name */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.userName}>{profile?.name ?? 'Your Name'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>🔒 Secure Account</Text>
            </View>
          </View>

          {/* Edit / Save buttons */}
          <View style={styles.actionRow}>
            {editing ? (
              <>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveEdit} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color={Colors.white} size="small" />
                    : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.editBtn} onPress={startEdit}>
                <Text style={styles.editBtnText}>✏️  Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Personal Info */}
          <Section title="Personal Information">
            <Field
              label="Full Name"
              value={data?.name ?? ''}
              editable={editing}
              onChangeText={(v) => update('name', v)}
            />
            <Field
              label="State"
              value={data?.state ?? ''}
              editable={editing}
              onChangeText={(v) => update('state', v)}
              placeholder="e.g. Maine"
            />
          </Section>

          {/* Family & Finances */}
          <Section title="Family & Finances">
            <Field
              label="Number of children"
              value={String(data?.family_size ?? '')}
              editable={editing}
              onChangeText={(v) => update('family_size', Number(v))}
              keyboardType="numeric"
            />
            <Field
              label="Annual household income"
              value={data?.income_bracket ?? ''}
              editable={editing}
              onChangeText={(v) => update('income_bracket', v)}
              placeholder="e.g. $35,000"
            />
            {editing ? (
              <ChipPicker
                label="Need childcare assistance?"
                value={data?.childcare_needed ? 'Yes' : 'No'}
                options={['Yes', 'No']}
                onSelect={(v) => update('childcare_needed', v === 'Yes')}
              />
            ) : (
              <Field
                label="Childcare assistance needed"
                value={data?.childcare_needed ? 'Yes' : 'No'}
                editable={false}
              />
            )}
          </Section>

          {/* Education & Work */}
          <Section title="Education & Work">
            <Field
              label="Highest education completed"
              value={data?.education_level ?? ''}
              editable={editing}
              onChangeText={(v) => update('education_level', v)}
              placeholder="e.g. Some college"
            />
            <Field
              label="Field of study / interest"
              value={data?.field_of_study ?? ''}
              editable={editing}
              onChangeText={(v) => update('field_of_study', v)}
              placeholder="e.g. Healthcare, Business"
            />
            <Field
              label="Hours available per week"
              value={String(data?.hours_per_week ?? '')}
              editable={editing}
              onChangeText={(v) => update('hours_per_week', Number(v))}
              keyboardType="numeric"
            />
          </Section>

          {/* Account Security */}
          <Section title="Account Security">
            <View style={styles.securityRow}>
              <View style={styles.securityIcon}><Text>📧</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.securityLabel}>Email address</Text>
                <Text style={styles.securityValue}>{user?.email}</Text>
              </View>
              <View style={styles.verifiedChip}><Text style={styles.verifiedChipText}>Verified</Text></View>
            </View>

            <TouchableOpacity style={styles.securityRow} onPress={() => setPwModalOpen(true)}>
              <View style={styles.securityIcon}><Text>🔑</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.securityLabel}>Password</Text>
                <Text style={styles.securityValue}>••••••••</Text>
              </View>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>

            <View style={styles.securityRow}>
              <View style={styles.securityIcon}><Text>🛡️</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.securityLabel}>Data encryption</Text>
                <Text style={styles.securityValue}>Your data is encrypted at rest & in transit</Text>
              </View>
            </View>
          </Section>

          {/* Sign out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          {profile?.updated_at && (
            <Text style={styles.lastUpdated}>
              Last updated {new Date(profile.updated_at).toLocaleDateString()}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ChangePasswordModal
        visible={pwModalOpen}
        onClose={() => setPwModalOpen(false)}
      />
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Field({
  label, value, editable, onChangeText, placeholder, keyboardType,
}: {
  label: string; value: string; editable: boolean;
  onChangeText?: (v: string) => void;
  placeholder?: string; keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editable ? (
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor={Colors.textLight}
          keyboardType={keyboardType ?? 'default'}
        />
      ) : (
        <Text style={styles.fieldValue}>{value || '—'}</Text>
      )}
    </View>
  );
}

function ChipPicker({ label, value, options, onSelect }: {
  label: string; value: string; options: string[]; onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        {options.map((o) => (
          <TouchableOpacity
            key={o}
            style={[styles.chip, value === o && styles.chipActive]}
            onPress={() => onSelect(o)}
          >
            <Text style={[styles.chipText, value === o && styles.chipTextActive]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (next.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (next !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await changePassword(next);
      Alert.alert('Password updated', 'Your password has been changed successfully.');
      setNext(''); setConfirm('');
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Change Password</Text>
        <Text style={styles.modalSub}>Choose a strong password with at least 8 characters.</Text>

        <TextInput
          style={styles.modalInput}
          placeholder="New password"
          placeholderTextColor={Colors.textLight}
          value={next}
          onChangeText={setNext}
          secureTextEntry
        />
        <TextInput
          style={styles.modalInput}
          placeholder="Confirm new password"
          placeholderTextColor={Colors.textLight}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />

        {error ? <Text style={styles.modalError}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.modalBtn, loading && { opacity: 0.6 }]}
          onPress={submit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.modalBtnText}>Update Password</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textMid, fontSize: 14 },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.navy,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: Colors.white, fontSize: 28, fontWeight: '700' },
  userName: { fontSize: 22, fontWeight: '700', color: Colors.navy, marginBottom: 4 },
  userEmail: { fontSize: 13.5, color: Colors.textMid, marginBottom: 10 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.sageLight, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full,
  },
  verifiedText: { fontSize: 12, color: '#3a7a50', fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  editBtn: {
    flex: 1, backgroundColor: Colors.navy, borderRadius: Radius.md,
    padding: 13, alignItems: 'center',
  },
  editBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  saveBtn: {
    flex: 1, backgroundColor: Colors.sage, borderRadius: Radius.md,
    padding: 13, alignItems: 'center',
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    paddingHorizontal: 20, backgroundColor: Colors.white, borderRadius: Radius.md,
    padding: 13, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
  },
  cancelBtnText: { color: Colors.textMid, fontWeight: '600', fontSize: 14 },

  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textLight,
    letterSpacing: 0.08, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4,
  },
  sectionCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, ...Shadow.sm, overflow: 'hidden' },

  fieldRow: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border },
  fieldLabel: { fontSize: 11.5, color: Colors.textLight, fontWeight: '600', marginBottom: 3 },
  fieldValue: { fontSize: 14.5, color: Colors.textDark, fontWeight: '500' },
  fieldInput: {
    fontSize: 14.5, color: Colors.textDark, fontWeight: '500',
    borderWidth: 1.5, borderColor: Colors.sage, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, marginTop: 2,
    backgroundColor: Colors.cream,
  },

  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.cream, borderWidth: 1.5, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  chipText: { fontSize: 13, color: Colors.textMid, fontWeight: '600' },
  chipTextActive: { color: Colors.white },

  securityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  securityIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.cream,
    alignItems: 'center', justifyContent: 'center',
  },
  securityLabel: { fontSize: 11.5, color: Colors.textLight, fontWeight: '600' },
  securityValue: { fontSize: 13.5, color: Colors.textDark, marginTop: 1 },
  verifiedChip: { backgroundColor: Colors.sageLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  verifiedChipText: { fontSize: 11, color: '#3a7a50', fontWeight: '700' },
  changeText: { fontSize: 13, color: Colors.navy, fontWeight: '600' },

  signOutBtn: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    padding: 15, alignItems: 'center', marginBottom: 12,
    borderWidth: 1.5, borderColor: Colors.terracotta,
  },
  signOutText: { color: Colors.terracotta, fontWeight: '700', fontSize: 15 },
  lastUpdated: { textAlign: 'center', fontSize: 11.5, color: Colors.textLight },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, ...Shadow.lg,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.navy, marginBottom: 6 },
  modalSub: { fontSize: 13.5, color: Colors.textMid, marginBottom: 20 },
  modalInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    padding: 13, fontSize: 15, color: Colors.textDark,
    backgroundColor: Colors.cream, marginBottom: 12,
  },
  modalError: { color: Colors.terracotta, fontSize: 13, marginBottom: 10 },
  modalBtn: { backgroundColor: Colors.navy, borderRadius: Radius.md, padding: 15, alignItems: 'center', marginTop: 4 },
  modalBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  modalCancel: { padding: 14, alignItems: 'center' },
  modalCancelText: { color: Colors.textMid, fontWeight: '600', fontSize: 14 },
});
