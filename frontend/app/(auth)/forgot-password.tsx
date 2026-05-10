import { Colors, Radius, Shadow } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleReset() {
    setError('');
    if (!email || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? 'Reset failed. Check your email address.');
        return;
      }
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? 'Connection error.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.title}>Password Updated!</Text>
          <Text style={styles.sub}>You can now sign in with your new password.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.btnText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.sub}>Enter your email and choose a new password.</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textLight}
          value={email}
          onChangeText={(t) => { setEmail(t); setError(''); }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="New Password"
          placeholderTextColor={Colors.textLight}
          value={newPassword}
          onChangeText={(t) => { setNewPassword(t); setError(''); }}
          secureTextEntry
          autoComplete="new-password"
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          placeholderTextColor={Colors.textLight}
          value={confirmPassword}
          onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
          secureTextEntry
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.btnText}>Reset Password</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>
            Remember your password? <Text style={styles.linkBold}>Sign in</Text>
          </Text>
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
  successEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    padding: 14, fontSize: 15, color: Colors.textDark,
    backgroundColor: Colors.cream, marginBottom: 14,
  },
  errorBox: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: Radius.sm, padding: 12, marginBottom: 12,
  },
  errorText: { color: '#dc2626', fontSize: 13.5, textAlign: 'center' },
  btn: { backgroundColor: Colors.navy, borderRadius: Radius.md, padding: 16, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  link: { textAlign: 'center', marginTop: 18, fontSize: 13.5, color: Colors.textMid },
  linkBold: { color: Colors.navy, fontWeight: '600' },
});
