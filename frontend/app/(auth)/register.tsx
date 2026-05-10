import { Colors, Radius, Shadow } from '@/constants/theme';
import { saveAuthData } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleToken(authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      setError('Google sign in failed. Please try again.');
    }
  }, [response]);

  async function handleGoogleToken(accessToken: string) {
    setGoogleLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? 'Google sign in failed');
        return;
      }
      await saveAuthData(data.token, { id: data.user_id, email: data.email });
      useAuthStore.getState().setAuth(data.token, { id: data.user_id, email: data.email });
      router.replace('/(auth)/onboarding');
    } catch (e: any) {
      setError(e.message ?? 'Connection error. Check your network.');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function signUp() {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? 'Sign up failed. Please try again.');
        return;
      }
      await saveAuthData(data.token, { id: data.user_id, email: data.email });
      useAuthStore.getState().setAuth(data.token, { id: data.user_id, email: data.email });
      router.replace('/(auth)/onboarding');
    } catch (e: any) {
      setError(e.message ?? 'Connection error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.sub}>PathLight will build a personalized plan for you.</Text>

        <TouchableOpacity
          style={[styles.googleBtn, (googleLoading || !request) && styles.btnDisabled]}
          onPress={() => { setError(''); promptAsync(); }}
          disabled={!request || googleLoading}
        >
          {googleLoading
            ? <ActivityIndicator size="small" color={Colors.textMid} />
            : <Text style={styles.googleIcon}>G</Text>
          }
          <Text style={styles.googleBtnText}>
            {googleLoading ? 'Signing in…' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={Colors.textLight}
          value={name}
          onChangeText={(t) => { setName(t); setError(''); }}
          autoComplete="name"
        />
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
          placeholder="Password (min 6 characters)"
          placeholderTextColor={Colors.textLight}
          value={password}
          onChangeText={(t) => { setPassword(t); setError(''); }}
          secureTextEntry
          autoComplete="new-password"
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={signUp}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.btnText}>Get Started</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>
            Already have an account? <Text style={styles.linkBold}>Sign in</Text>
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
  sub: { fontSize: 14, color: Colors.textMid, marginBottom: 20, lineHeight: 20 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    padding: 14, backgroundColor: Colors.white, gap: 10,
  },
  googleIcon: { fontSize: 16, fontWeight: '700', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textDark },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.textLight },
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
