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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function signIn() {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data.session) {
      router.replace('/(tabs)');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🌿</Text>
          </View>
          <Text style={styles.logoText}>PathLight</Text>
        </View>
        <Text style={styles.tagline}>Your AI guide to education, funding & wellness</Text>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textLight}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={signIn} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 28, ...Shadow.lg },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  logoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.sage, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 20 },
  logoText: { fontSize: 24, fontWeight: '700', color: Colors.navy },
  tagline: { fontSize: 14, color: Colors.textMid, marginBottom: 28, lineHeight: 20 },
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
