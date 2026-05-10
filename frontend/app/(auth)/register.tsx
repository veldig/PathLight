import { Colors, Radius, Shadow } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function signUp() {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (!data.session) {
      setSuccess(true);
    } else {
      router.replace('/(auth)/onboarding');
    }
  }

  if (success) {
    return (
      <View style={[styles.container, { alignItems: 'center' }]}>
        <View style={styles.card}>
          <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>📬</Text>
          <Text style={[styles.title, { textAlign: 'center' }]}>Check your email</Text>
          <Text style={[styles.sub, { textAlign: 'center' }]}>
            We sent a confirmation link to <Text style={{ fontWeight: '700' }}>{email}</Text>. Click it to activate your account, then sign in.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.btnText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.sub}>PathLight will build a personalized plan for you.</Text>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={Colors.textLight} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textLight} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={Colors.textLight} value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={signUp} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Creating account…' : 'Get Started'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 28, ...Shadow.lg },
  title: { fontSize: 22, fontWeight: '700', color: Colors.navy, marginBottom: 6 },
  sub: { fontSize: 14, color: Colors.textMid, marginBottom: 24, lineHeight: 20 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    padding: 14, fontSize: 15, color: Colors.textDark,
    backgroundColor: Colors.cream, marginBottom: 14,
  },
  btn: { backgroundColor: Colors.navy, borderRadius: Radius.md, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  link: { textAlign: 'center', marginTop: 18, fontSize: 13.5, color: Colors.textMid },
  linkBold: { color: Colors.navy, fontWeight: '600' },
  errorBox: { backgroundColor: '#fde8e8', borderRadius: Radius.md, padding: 12, marginBottom: 14 },
  errorText: { color: '#c0392b', fontSize: 13, textAlign: 'center' },
});
