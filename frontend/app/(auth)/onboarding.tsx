import { Colors, Radius, Shadow } from '@/constants/theme';
import { api, UserProfile } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const STEPS = [
  { title: 'About you', fields: ['name', 'state'] },
  { title: 'Family & finances', fields: ['family_size', 'income_bracket', 'childcare_needed'] },
  { title: 'Education & work', fields: ['education_level', 'field_of_study', 'hours_per_week'] },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function update(key: keyof UserProfile, value: string | number | boolean) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function finish() {
    setLoading(true);
    try {
      await api.updateProfile(profile);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error saving profile', e.message);
    }
    setLoading(false);
  }

  const isLast = step === STEPS.length - 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.stepLabel}>Step {step + 1} of {STEPS.length}</Text>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.title}>{STEPS[step].title}</Text>
      </View>

      <View style={styles.card}>
        {step === 0 && (
          <>
            <Field label="Your name" value={profile.name ?? ''} onChangeText={(v) => update('name', v)} />
            <Field label="State you live in (e.g. Maine)" value={profile.state ?? ''} onChangeText={(v) => update('state', v)} />
          </>
        )}
        {step === 1 && (
          <>
            <Field label="Number of children" value={String(profile.family_size ?? '')} onChangeText={(v) => update('family_size', Number(v))} keyboardType="numeric" />
            <Field label="Annual household income (e.g. $35,000)" value={profile.income_bracket ?? ''} onChangeText={(v) => update('income_bracket', v)} />
            <Picker
              label="Do you need childcare assistance?"
              value={profile.childcare_needed ? 'Yes' : 'No'}
              options={['Yes', 'No']}
              onSelect={(v) => update('childcare_needed', v === 'Yes')}
            />
          </>
        )}
        {step === 2 && (
          <>
            <Field label="Highest education completed" value={profile.education_level ?? ''} onChangeText={(v) => update('education_level', v)} placeholder="e.g. Some college" />
            <Field label="Field you want to study / work in" value={profile.field_of_study ?? ''} onChangeText={(v) => update('field_of_study', v)} placeholder="e.g. Healthcare, Business" />
            <Field label="Hours available per week for school/work" value={String(profile.hours_per_week ?? '')} onChangeText={(v) => update('hours_per_week', Number(v))} keyboardType="numeric" />
          </>
        )}
      </View>

      <View style={styles.btnRow}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.btn, { flex: 1 }]}
          onPress={isLast ? finish : () => setStep(step + 1)}
          disabled={loading}
        >
          <Text style={styles.btnText}>{isLast ? (loading ? 'Saving…' : 'Finish Setup') : 'Continue →'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={Colors.textLight} {...props} />
    </View>
  );
}

function Picker({ label, value, options, onSelect }: { label: string; value: string; options: string[]; onSelect: (v: string) => void }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerRow}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 24 },
  stepLabel: { fontSize: 12, fontWeight: '700', color: Colors.textLight, letterSpacing: 0.08, textTransform: 'uppercase', marginBottom: 8 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.navy, width: 20 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.navy },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 22, ...Shadow.sm, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textMid, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    padding: 13, fontSize: 15, color: Colors.textDark, backgroundColor: Colors.cream,
  },
  pickerRow: { flexDirection: 'row', gap: 10 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.cream, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  chipText: { fontSize: 14, color: Colors.textMid, fontWeight: '600' },
  chipTextActive: { color: Colors.white },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { backgroundColor: Colors.navy, borderRadius: Radius.md, padding: 16, alignItems: 'center' },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  backBtn: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 20 },
  backBtnText: { color: Colors.textMid, fontWeight: '600', fontSize: 15 },
});
