import { api } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/constants/theme';
import CameraWithAttention from './CameraWithAttention';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type FocusLevel = 'high' | 'medium' | 'low';

const IS_NATIVE = Platform.OS !== 'web';

export default function FocusPathScreen() {
  const router = useRouter();
  const [focusLevel, setFocusLevel] = useState<FocusLevel>('high');
  const [topic, setTopic] = useState('');
  const [coaching, setCoaching] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const soundRef = useRef<any>(null);
  const prevLevel = useRef<FocusLevel>('high');

  // Auto-refresh coaching when focus level changes mid-session
  useEffect(() => {
    if (!coaching) return;
    if (prevLevel.current === focusLevel) return;
    prevLevel.current = focusLevel;
    fetchCoaching(topic, focusLevel);
  }, [focusLevel]);

  useEffect(() => () => { soundRef.current?.unloadAsync?.(); }, []);

  async function fetchCoaching(t: string, level: FocusLevel) {
    if (!t.trim()) return;
    setLoading(true);
    try {
      const { hint } = await api.getFocusHint(t, level, 'study');
      setCoaching(hint);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    if (!topic.trim()) return;
    prevLevel.current = focusLevel;
    await fetchCoaching(topic, focusLevel);
  }

  async function handleSpeak() {
    if (!coaching || !IS_NATIVE) return;
    if (speaking) {
      await soundRef.current?.stopAsync?.();
      setSpeaking(false);
      return;
    }
    setVoiceLoading(true);
    try {
      const { audio_b64 } = await api.speakText(coaching);
      const FileSystem = require('expo-file-system');
      const { Audio } = require('expo-av');
      const uri = FileSystem.cacheDirectory + 'coach.mp3';
      await FileSystem.writeAsStringAsync(uri, audio_b64, { encoding: FileSystem.EncodingType.Base64 });
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      setSpeaking(true);
      sound.setOnPlaybackStatusUpdate((s: any) => { if (s.didJustFinish) setSpeaking(false); });
    } catch (e) {
      console.error(e);
    } finally {
      setVoiceLoading(false);
    }
  }

  const focusColor = focusLevel === 'high' ? '#4caf7d' : focusLevel === 'medium' ? '#f5a623' : '#e05252';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Text style={{ fontSize: 22, color: Colors.navy }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🎯 FocusPath</Text>
          <View style={styles.liveChip}><Text style={styles.liveTxt}>Live</Text></View>
        </View>

        {/* Camera + attention tracking */}
        <CameraWithAttention focusLevel={focusLevel} onFocusChange={setFocusLevel} />

        {/* Topic input */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>What do you want to learn?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. The French Revolution, Calculus derivatives…"
            placeholderTextColor={Colors.textLight}
            value={topic}
            onChangeText={setTopic}
            multiline
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.startBtn, (!topic.trim() || loading) && { opacity: 0.5 }]}
            onPress={handleStart}
            disabled={!topic.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.startBtnTxt}>{coaching ? 'Refresh coaching' : 'Start session'}</Text>}
          </TouchableOpacity>
        </View>

        {/* AI coaching card */}
        {coaching && (
          <View style={[styles.coachCard, { borderLeftColor: focusColor }]}>
            <View style={styles.coachHeader}>
              <Text style={styles.coachLabel}>AI Coach</Text>
              <TouchableOpacity
                style={[styles.speakBtn, speaking && styles.speakBtnOn]}
                onPress={handleSpeak}
                disabled={voiceLoading || !IS_NATIVE}
              >
                {voiceLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.speakBtnTxt}>{speaking ? '⏹ Stop' : '🔊 Speak'}</Text>}
              </TouchableOpacity>
            </View>
            <Text style={styles.coachText}>{coaching}</Text>
            {!IS_NATIVE && (
              <Text style={styles.webNote}>Voice playback available on the mobile app.</Text>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 56 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.navy },
  liveChip: { backgroundColor: '#d4f4e2', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  liveTxt: { fontSize: 12, color: '#2d7a52', fontWeight: '700' },

  inputCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, marginBottom: 16, ...Shadow.sm },
  inputLabel: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    padding: 14, fontSize: 15, color: Colors.textDark, minHeight: 80,
    textAlignVertical: 'top', lineHeight: 22, marginBottom: 14,
  },
  startBtn: {
    backgroundColor: Colors.navy, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  startBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  coachCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18,
    marginBottom: 14, borderLeftWidth: 4, ...Shadow.sm,
  },
  coachHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  coachLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  coachText: { fontSize: 15, lineHeight: 24, color: Colors.textDark },
  speakBtn: {
    backgroundColor: Colors.navy, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 7, minWidth: 90, alignItems: 'center',
  },
  speakBtnOn: { backgroundColor: '#4caf7d' },
  speakBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  webNote: { fontSize: 11, color: Colors.textLight, marginTop: 10, fontStyle: 'italic' },
});
