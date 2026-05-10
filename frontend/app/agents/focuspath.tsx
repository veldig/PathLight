import { api } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── types ────────────────────────────────────────────────────────────────────

type FocusLevel = 'high' | 'medium' | 'low';

const IS_NATIVE = Platform.OS !== 'web';
const FOCUS_CYCLE: FocusLevel[] = ['high', 'medium', 'low'];

// ─── helpers ──────────────────────────────────────────────────────────────────

function focusColor(l: FocusLevel) {
  return l === 'high' ? '#4caf7d' : l === 'medium' ? '#f5a623' : '#e05252';
}
function focusLabel(l: FocusLevel) {
  return l === 'high' ? 'High Focus' : l === 'medium' ? 'Drifting…' : 'Low Focus';
}
function faceToFocusLevel(faces: any[]): FocusLevel {
  if (!faces.length) return 'low';
  const { rollAngle = 0, yawAngle = 0 } = faces[0];
  const drift = Math.abs(rollAngle) + Math.abs(yawAngle);
  return drift < 15 ? 'high' : drift < 35 ? 'medium' : 'low';
}

// ─── attention badge ──────────────────────────────────────────────────────────

function AttentionBadge({ level }: { level: FocusLevel }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const color = focusColor(level);
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Animated.View style={[styles.badgeDot, { backgroundColor: color, transform: [{ scale: pulse }] }]} />
      <Text style={[styles.badgeText, { color }]}>{focusLabel(level)}</Text>
    </View>
  );
}

// ─── camera card ─────────────────────────────────────────────────────────────

function CameraCard({ level, onFaces, onDemoCycle }: {
  level: FocusLevel;
  onFaces: (f: any[]) => void;
  onDemoCycle: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();

  return (
    <View style={styles.cameraCard}>
      <View style={styles.cameraFrame}>
        {!permission ? (
          <ActivityIndicator color={GOLD} />
        ) : !permission.granted ? (
          <View style={styles.permWrap}>
            <Text style={styles.permText}>Allow camera access to track your focus in real time.</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnTxt}>Enable Camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="front"
            {...(IS_NATIVE ? {
              onFacesDetected: ({ faces }: { faces: any[] }) => onFaces(faces),
              faceDetectorSettings: { mode: 'fast', detectLandmarks: 'none', runClassifications: 'none', minDetectionInterval: 300, tracking: true },
            } : {})}
          />
        )}
        {/* HUD corners */}
        <View style={[styles.corner, { top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2 }]} />
        <View style={[styles.corner, { top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2 }]} />
        <View style={[styles.corner, { bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
        <View style={[styles.corner, { bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2 }]} />
        {/* Focus dot */}
        <View style={[styles.focusDot, { backgroundColor: focusColor(level) }]} />
      </View>

      {/* Bottom row */}
      <View style={styles.cameraFooter}>
        <AttentionBadge level={level} />
        {!IS_NATIVE && (
          <TouchableOpacity onPress={onDemoCycle}>
            <Text style={styles.simTxt}>Simulate ↻</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function FocusPathScreen() {
  const router = useRouter();
  const [focusLevel, setFocusLevel] = useState<FocusLevel>('high');
  const [topic, setTopic] = useState('');
  const [coaching, setCoaching] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const soundRef = useRef<any>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLevel = useRef<FocusLevel>('high');

  const handleFaces = useCallback((faces: any[]) => {
    const next = faceToFocusLevel(faces);
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => setFocusLevel(next), 400);
  }, []);

  const cycleDemoFocus = () =>
    setFocusLevel((p) => FOCUS_CYCLE[(FOCUS_CYCLE.indexOf(p) + 1) % 3]);

  // When focus level drops, fetch new coaching from AI
  useEffect(() => {
    if (!coaching) return; // only auto-update once a session is active
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

        {/* Camera */}
        <CameraCard level={focusLevel} onFaces={handleFaces} onDemoCycle={cycleDemoFocus} />

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
          <View style={[styles.coachCard, { borderLeftColor: focusColor(focusLevel) }]}>
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

// ─── styles ───────────────────────────────────────────────────────────────────

const GOLD = '#C08A3A';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 56 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.navy },
  liveChip: { backgroundColor: '#d4f4e2', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  liveTxt: { fontSize: 12, color: '#2d7a52', fontWeight: '700' },

  // camera
  cameraCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, marginBottom: 16, ...Shadow.sm },
  cameraFrame: {
    height: 220, borderRadius: Radius.md, overflow: 'hidden',
    backgroundColor: '#1a2535', marginBottom: 12,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  corner: { position: 'absolute', width: 18, height: 18, borderColor: GOLD },
  focusDot: { position: 'absolute', bottom: 14, right: 14, width: 10, height: 10, borderRadius: 5 },
  permWrap: { alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  permText: { color: '#9aaabb', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: Colors.navy, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 10 },
  permBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cameraFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  simTxt: { fontSize: 12, color: Colors.textLight, textDecorationLine: 'underline' },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 13, fontWeight: '700' },

  // input
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

  // coaching
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
