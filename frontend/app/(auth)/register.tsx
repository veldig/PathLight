import { Colors, Radius, Shadow } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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
  const router = useRouter();

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) Alert.alert('Sign up failed', error.message);
    else router.replace('/(auth)/onboarding');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.sub}>PathLight will build a personalized plan for you.</Text>

        <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={Colors.textLight} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textLight} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={Colors.textLight} value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.btn} onPress={signUp} disabled={loading}>
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
});
