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
type SessionState = 'setup' | 'active' | 'distracted';

const IS_NATIVE = Platform.OS !== 'web';
const FOCUS_CYCLE: FocusLevel[] = ['high', 'medium', 'low'];
const DISTRACTION_THRESHOLD_MS = 5000; // 5 s of low/no focus → alert

// ─── helpers ──────────────────────────────────────────────────────────────────

function focusColor(l: FocusLevel) {
  return l === 'high' ? '#4caf7d' : l === 'medium' ? '#f5a623' : '#e05252';
}
function focusEmoji(l: FocusLevel) {
  return l === 'high' ? '🟢' : l === 'medium' ? '🟡' : '🔴';
}
function focusLabel(l: FocusLevel) {
  return l === 'high' ? 'Focused' : l === 'medium' ? 'Drifting…' : 'Distracted';
}
function faceToFocusLevel(faces: any[]): FocusLevel {
  if (!faces.length) return 'low';
  const { rollAngle = 0, yawAngle = 0 } = faces[0];
  const drift = Math.abs(rollAngle) + Math.abs(yawAngle);
  return drift < 15 ? 'high' : drift < 35 ? 'medium' : 'low';
}

// Play a short beep using Web Audio API (web only)
function playBeep() {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 520;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (_) {}
}

// ─── web attention tracking via FaceDetector API + tab/activity fallbacks ─────

function useWebAttention(sessionActive: boolean, onLevel: (l: FocusLevel) => void) {
  useEffect(() => {
    if (IS_NATIVE || !sessionActive) return;

    let timerId = 0;
    let lastActivity = Date.now();
    let detector: any = null;

    const bump = () => { lastActivity = Date.now(); };
    window.addEventListener('mousemove', bump, { passive: true });
    window.addEventListener('keydown', bump, { passive: true });

    const handleVis = () => { if (document.hidden) onLevel('low'); };
    document.addEventListener('visibilitychange', handleVis);

    async function initFaceDetector() {
      if ('FaceDetector' in window) {
        try { detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 }); }
        catch (_) {}
      }
    }

    async function tick() {
      // Try real face detection via browser API (Chrome/Edge with flag)
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (video && video.readyState >= 2 && detector) {
        try {
          const faces = await detector.detect(video);
          onLevel(faces.length > 0 ? 'high' : 'low');
          timerId = window.setTimeout(tick, 1500) as unknown as number;
          return;
        } catch (_) {}
      }
      // Fallback: tab visibility + idle timer
      const idle = Date.now() - lastActivity;
      if (document.hidden) onLevel('low');
      else if (idle > 30_000) onLevel('medium');
      else onLevel('high');
      timerId = window.setTimeout(tick, 2000) as unknown as number;
    }

    initFaceDetector().then(tick);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener('mousemove', bump);
      window.removeEventListener('keydown', bump);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [sessionActive]);
}

// ─── camera card ─────────────────────────────────────────────────────────────

function CameraCard({ level, sessionState, onFaces }: {
  level: FocusLevel;
  sessionState: SessionState;
  onFaces: (f: any[]) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const ringAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (sessionState === 'distracted') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, { toValue: 1.08, duration: 400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(ringAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    } else {
      ringAnim.setValue(1);
    }
  }, [sessionState]);

  const borderColor = sessionState === 'distracted' ? '#e05252'
    : sessionState === 'active' ? focusColor(level)
    : '#1a2535';

  return (
    <Animated.View style={[styles.cameraRing, { borderColor, transform: [{ scale: ringAnim }] }]}>
      <View style={styles.cameraFrame}>
        {!permission ? (
          <ActivityIndicator color={GOLD} />
        ) : !permission.granted ? (
          <View style={styles.permWrap}>
            <Text style={styles.permIcon}>📷</Text>
            <Text style={styles.permText}>Camera access lets FocusPath track your attention in real time.</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnTxt}>Enable Camera</Text>
            </TouchableOpacity>
          </View>
        ) : IS_NATIVE ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="front"
            onFacesDetected={({ faces }: { faces: any[] }) => onFaces(faces)}
            faceDetectorSettings={{ mode: 'fast', detectLandmarks: 'none', runClassifications: 'none', minDetectionInterval: 300, tracking: true }}
          />
        ) : (
          // Web: render a <video> element the browser hooks into via expo-camera
          <CameraView style={StyleSheet.absoluteFill} facing="front" />
        )}

        {/* HUD corners */}
        {['tl', 'tr', 'bl', 'br'].map((pos) => (
          <View key={pos} style={[styles.corner, {
            top: pos.startsWith('t') ? 10 : undefined,
            bottom: pos.startsWith('b') ? 10 : undefined,
            left: pos.endsWith('l') ? 10 : undefined,
            right: pos.endsWith('r') ? 10 : undefined,
            borderTopWidth: pos.startsWith('t') ? 2 : 0,
            borderBottomWidth: pos.startsWith('b') ? 2 : 0,
            borderLeftWidth: pos.endsWith('l') ? 2 : 0,
            borderRightWidth: pos.endsWith('r') ? 2 : 0,
            borderColor: sessionState === 'active' ? focusColor(level) : GOLD,
          }]} />
        ))}

        {/* Status dot */}
        <View style={[styles.statusDot, { backgroundColor: sessionState === 'setup' ? '#555' : focusColor(level) }]} />
      </View>
    </Animated.View>
  );
}

// ─── session timer ────────────────────────────────────────────────────────────

function SessionTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  return <Text style={styles.timerText}>⏱ {m}:{s}</Text>;
}

// ─── distraction banner ───────────────────────────────────────────────────────

function DistractionBanner({ onDismiss }: { onDismiss: () => void }) {
  const slide = useRef(new Animated.Value(-80)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
  }, []);
  return (
    <Animated.View style={[styles.distractionBanner, { transform: [{ translateY: slide }] }]}>
      <Text style={styles.distractionEmoji}>👀</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.distractionTitle}>Hey, come back!</Text>
        <Text style={styles.distractionSub}>You seem distracted. Tap to refocus.</Text>
      </View>
      <TouchableOpacity style={styles.refocusBtn} onPress={onDismiss}>
        <Text style={styles.refocusBtnTxt}>Refocus</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── focus badge (inline) ─────────────────────────────────────────────────────

function FocusBadge({ level }: { level: FocusLevel }) {
  const color = focusColor(level);
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: color + '18' }]}>
      <Text style={styles.badgeEmoji}>{focusEmoji(level)}</Text>
      <Text style={[styles.badgeText, { color }]}>{focusLabel(level)}</Text>
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function FocusPathScreen() {
  const router = useRouter();

  const [focusLevel, setFocusLevel] = useState<FocusLevel>('high');
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [topic, setTopic] = useState('');
  const [coaching, setCoaching] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [sessionStart, setSessionStart] = useState(0);
  const [distractedCount, setDistractedCount] = useState(0);

  const soundRef = useRef<any>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const distractionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLevel = useRef<FocusLevel>('high');
  const coachCooldown = useRef(false);

  // Native face detection handler
  const handleFaces = useCallback((faces: any[]) => {
    const next = faceToFocusLevel(faces);
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => setFocusLevel(next), 400);
  }, []);

  // Web attention tracking
  useWebAttention(sessionState !== 'setup', (lvl) => setFocusLevel(lvl));

  // React to focus level changes during active session
  useEffect(() => {
    if (sessionState === 'setup') return;
    if (prevLevel.current === focusLevel) return;
    prevLevel.current = focusLevel;

    if (focusLevel !== 'high') {
      // Start distraction timer
      if (distractionTimer.current) clearTimeout(distractionTimer.current);
      distractionTimer.current = setTimeout(() => {
        if (sessionState !== 'distracted') {
          setSessionState('distracted');
          setDistractedCount((c) => c + 1);
          playBeep();
          // Auto-fetch new coaching tailored to low attention
          if (!coachCooldown.current) {
            coachCooldown.current = true;
            fetchCoaching(topic, focusLevel).finally(() => {
              setTimeout(() => { coachCooldown.current = false; }, 15_000);
            });
          }
        }
      }, DISTRACTION_THRESHOLD_MS);
    } else {
      if (distractionTimer.current) clearTimeout(distractionTimer.current);
      if (sessionState === 'distracted') setSessionState('active');
    }
  }, [focusLevel, sessionState]);

  useEffect(() => () => {
    soundRef.current?.unloadAsync?.();
    if (focusTimer.current) clearTimeout(focusTimer.current);
    if (distractionTimer.current) clearTimeout(distractionTimer.current);
  }, []);

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
    setSessionStart(Date.now());
    setSessionState('active');
    setDistractedCount(0);
    await fetchCoaching(topic, focusLevel);
  }

  function handleRefocus() {
    setSessionState('active');
    if (distractionTimer.current) clearTimeout(distractionTimer.current);
  }

  function handleEndSession() {
    setSessionState('setup');
    setCoaching(null);
    setDistractedCount(0);
    if (distractionTimer.current) clearTimeout(distractionTimer.current);
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

  const isSessionActive = sessionState !== 'setup';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Distraction banner overlays everything */}
      {sessionState === 'distracted' && <DistractionBanner onDismiss={handleRefocus} />}

      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Text style={{ fontSize: 22, color: Colors.navy }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🎯 FocusPath</Text>
          {isSessionActive
            ? <SessionTimer startTime={sessionStart} />
            : <View style={styles.liveChip}><Text style={styles.liveTxt}>Ready</Text></View>
          }
        </View>

        {/* Camera */}
        <CameraCard
          level={focusLevel}
          sessionState={sessionState}
          onFaces={handleFaces}
        />

        {/* Attention status row (only during session) */}
        {isSessionActive && (
          <View style={styles.statusRow}>
            <FocusBadge level={focusLevel} />
            {distractedCount > 0 && (
              <Text style={styles.distractedStat}>↩ {distractedCount} distraction{distractedCount > 1 ? 's' : ''}</Text>
            )}
          </View>
        )}

        {/* Setup card or session controls */}
        {sessionState === 'setup' ? (
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>What do you want to study?</Text>
            <Text style={styles.inputHint}>FocusPath will watch your attention and coach you when you drift.</Text>
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
                : <Text style={styles.startBtnTxt}>Start Focus Session →</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sessionControls}>
            <View style={styles.topicPill}>
              <Text style={styles.topicPillLabel}>Studying</Text>
              <Text style={styles.topicPillValue} numberOfLines={1}>{topic}</Text>
            </View>
            <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
              <Text style={styles.endBtnTxt}>End</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI coaching card */}
        {coaching && (
          <View style={[styles.coachCard, { borderLeftColor: focusColor(focusLevel) }]}>
            <View style={styles.coachHeader}>
              <View>
                <Text style={styles.coachLabel}>AI Coach</Text>
                <Text style={styles.coachSub}>
                  {focusLevel === 'high' ? 'Keep it up!' : focusLevel === 'medium' ? 'You\'re drifting — here\'s a nudge' : 'Let\'s get back on track'}
                </Text>
              </View>
              <View style={styles.coachActions}>
                <TouchableOpacity
                  style={styles.refreshBtn}
                  onPress={() => fetchCoaching(topic, focusLevel)}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color={Colors.navy} size="small" /> : <Text style={styles.refreshBtnTxt}>↻</Text>}
                </TouchableOpacity>
                {IS_NATIVE && (
                  <TouchableOpacity
                    style={[styles.speakBtn, speaking && styles.speakBtnOn]}
                    onPress={handleSpeak}
                    disabled={voiceLoading}
                  >
                    {voiceLoading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.speakBtnTxt}>{speaking ? '⏹' : '🔊'}</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <Text style={styles.coachText}>{coaching}</Text>
          </View>
        )}

        {/* Loading first coaching */}
        {loading && !coaching && (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={Colors.navy} />
            <Text style={styles.loadingTxt}>Getting your coaching ready…</Text>
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

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.navy },
  liveChip: { backgroundColor: '#e8f0fe', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  liveTxt: { fontSize: 12, color: Colors.navy, fontWeight: '700' },
  timerText: { fontSize: 13, color: Colors.textMid, fontWeight: '700' },

  // Camera
  cameraRing: {
    borderRadius: Radius.lg + 4, borderWidth: 3,
    marginBottom: 12, overflow: 'hidden',
  },
  cameraFrame: {
    height: 220, backgroundColor: '#1a2535',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  corner: { position: 'absolute', width: 18, height: 18 },
  statusDot: { position: 'absolute', bottom: 12, right: 12, width: 10, height: 10, borderRadius: 5 },
  permWrap: { alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  permIcon: { fontSize: 32, marginBottom: 4 },
  permText: { color: '#9aaabb', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: Colors.navy, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 10 },
  permBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Status row
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  badgeEmoji: { fontSize: 13 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  distractedStat: { fontSize: 12, color: Colors.textLight },

  // Distraction banner
  distractionBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: '#e05252', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    ...Shadow.sm,
  },
  distractionEmoji: { fontSize: 28 },
  distractionTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  distractionSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  refocusBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  refocusBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Input card (setup)
  inputCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, marginBottom: 16, ...Shadow.sm },
  inputLabel: { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  inputHint: { fontSize: 13, color: Colors.textLight, marginBottom: 12, lineHeight: 18 },
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

  // Session controls bar
  sessionControls: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 14,
  },
  topicPill: {
    flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: 10, ...Shadow.sm,
  },
  topicPillLabel: { fontSize: 10, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  topicPillValue: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  endBtn: {
    backgroundColor: '#f5f5f5', borderRadius: Radius.lg,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  endBtnTxt: { fontSize: 13, fontWeight: '700', color: Colors.textMid },

  // Coaching card
  coachCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18,
    marginBottom: 14, borderLeftWidth: 4, ...Shadow.sm,
  },
  coachHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  coachLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMid, textTransform: 'uppercase', letterSpacing: 0.8 },
  coachSub: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  coachText: { fontSize: 15, lineHeight: 24, color: Colors.textDark },
  coachActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  refreshBtnTxt: { fontSize: 18, color: Colors.navy },
  speakBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center',
  },
  speakBtnOn: { backgroundColor: '#4caf7d' },
  speakBtnTxt: { fontSize: 16 },

  // Loading first coaching
  loadingCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 24,
    alignItems: 'center', gap: 12, ...Shadow.sm,
  },
  loadingTxt: { fontSize: 14, color: Colors.textLight },
});
