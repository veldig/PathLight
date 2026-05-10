import { api } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── types ────────────────────────────────────────────────────────────────────

type Mode = 'read' | 'watch' | 'quiz';
type FocusLevel = 'high' | 'medium' | 'low';

// ─── constants ────────────────────────────────────────────────────────────────

const TOPIC = 'Biology · Chapter 4: The Cell';
const IS_NATIVE = Platform.OS !== 'web';

const READ_TEXT =
  'The mitochondria is often called the powerhouse of the cell. ' +
  'It generates most of the cell’s supply of adenosine triphosphate (ATP), ' +
  'used as a source of chemical energy. Mitochondria are found in nearly all eukaryotic cells.';

const QUIZ_OPTIONS = [
  'Mitochondria produce ATP via cellular respiration',
  'The nucleus controls protein synthesis',
  'Ribosomes are found only in the nucleus',
  'Cell membranes are made of a lipid monolayer',
];

const MODES: { key: Mode; icon: string; label: string }[] = [
  { key: 'read', icon: '📖', label: 'Read' },
  { key: 'watch', icon: '🎬', label: 'Watch' },
  { key: 'quiz', icon: '✏️', label: 'Quiz' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function focusColor(level: FocusLevel) {
  return level === 'high' ? '#4caf7d' : level === 'medium' ? '#f5a623' : '#e05252';
}
function focusLabel(level: FocusLevel) {
  return level === 'high' ? 'High Focus' : level === 'medium' ? 'Drifting…' : 'Low Focus';
}
function faceToFocusLevel(faces: any[]): FocusLevel {
  if (faces.length === 0) return 'low';
  const { rollAngle, yawAngle } = faces[0];
  const drift = Math.abs(rollAngle) + Math.abs(yawAngle);
  if (drift < 15) return 'high';
  if (drift < 35) return 'medium';
  return 'low';
}

// ─── sub-components ───────────────────────────────────────────────────────────

function AttentionBadge({ level }: { level: FocusLevel }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const color = focusColor(level);
  return (
    <View style={[styles.attentionBadge, { borderColor: color }]}>
      <Animated.View style={[styles.attentionDot, { backgroundColor: color, transform: [{ scale: pulse }] }]} />
      <Text style={[styles.attentionText, { color }]}>{focusLabel(level)}</Text>
    </View>
  );
}

function FocusMeter({ level }: { level: FocusLevel }) {
  const widthAnim = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: level === 'high' ? 0.85 : level === 'medium' ? 0.5 : 0.22,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [level]);
  const score = level === 'high' ? 85 : level === 'medium' ? 50 : 22;
  return (
    <View style={styles.meterWrap}>
      <Text style={styles.meterLabel}>Attention Score</Text>
      <View style={styles.meterTrack}>
        <Animated.View
          style={[
            styles.meterFill,
            {
              backgroundColor: focusColor(level),
              width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      <Text style={[styles.meterValue, { color: focusColor(level) }]}>{score} / 100</Text>
    </View>
  );
}

// Web demo camera (no native APIs)
function DemoCameraFrame({ level }: { level: FocusLevel }) {
  return (
    <View style={styles.cameraFrame}>
      <View style={styles.cameraCornerTL} />
      <View style={styles.cameraCornerTR} />
      <View style={styles.cameraCornerBL} />
      <View style={styles.cameraCornerBR} />
      <View style={styles.faceSilhouette}>
        <Text style={{ fontSize: 42 }}>🧑‍💻</Text>
        <Text style={{ fontSize: 11, color: '#6a8aaa', marginTop: 6 }}>Demo mode — open on device for live tracking</Text>
      </View>
      <View style={[styles.gazeDot, { backgroundColor: focusColor(level) }]} />
    </View>
  );
}

// Native camera (lazy-loaded so web never imports it)
function NativeCameraFrame({ level, onFacesDetected }: { level: FocusLevel; onFacesDetected: (faces: any[]) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { CameraView, useCameraPermissions } = require('expo-camera');
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <View style={styles.cameraFrame}><ActivityIndicator color={GOLD} /></View>;

  if (!permission.granted) {
    return (
      <View style={[styles.cameraFrame, { justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 }]}>
        <Text style={{ color: '#9aaabb', fontSize: 14, textAlign: 'center' }}>
          Camera access enables real-time attention tracking.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraFrame}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="front"
        onFacesDetected={({ faces }: { faces: any[] }) => onFacesDetected(faces)}
        faceDetectorSettings={{ mode: 'fast', detectLandmarks: 'none', runClassifications: 'none', minDetectionInterval: 300, tracking: true }}
      />
      <View style={styles.cameraCornerTL} />
      <View style={styles.cameraCornerTR} />
      <View style={styles.cameraCornerBL} />
      <View style={styles.cameraCornerBR} />
      <View style={[styles.gazeDot, { backgroundColor: focusColor(level) }]} />
    </View>
  );
}

function CameraCard({ level, onFacesDetected, onDemoToggle }: {
  level: FocusLevel;
  onFacesDetected: (faces: any[]) => void;
  onDemoToggle?: () => void;
}) {
  return (
    <View style={styles.cameraCard}>
      {IS_NATIVE
        ? <NativeCameraFrame level={level} onFacesDetected={onFacesDetected} />
        : <DemoCameraFrame level={level} />}
      <View style={styles.cameraInfo}>
        <AttentionBadge level={level} />
        <Text style={styles.cameraSubText}>
          {IS_NATIVE ? 'Front camera · Gaze & head tracking active' : 'Webcam · Gesture & gaze tracking'}
        </Text>
      </View>
      {!IS_NATIVE && (
        <TouchableOpacity onPress={onDemoToggle} style={styles.debugBtn}>
          <Text style={styles.debugBtnText}>Simulate focus change ↻</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ModeSelector({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <View style={styles.modeRow}>
      {MODES.map(({ key, icon, label }) => {
        const active = mode === key;
        return (
          <TouchableOpacity key={key} style={[styles.modeBtn, active && styles.modeBtnActive]} onPress={() => onChange(key)}>
            <Text style={styles.modeIcon}>{icon}</Text>
            <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ReadContent({ onRephrase, loading, rephrased }: {
  onRephrase: () => void; loading: boolean; rephrased: string | null;
}) {
  return (
    <View style={[styles.contentCard, rephrased ? { borderLeftWidth: 4, borderLeftColor: GOLD } : {}]}>
      <Text style={styles.contentTitle}>{rephrased ? 'Rephrased by AI ✨' : TOPIC}</Text>
      {rephrased ? (
        <Text style={styles.contentBody}>{rephrased}</Text>
      ) : (
        <Text style={styles.contentBody}>
          The <Text style={styles.highlight}>mitochondria</Text> is often called the powerhouse of the cell.
          It generates most of the cell's supply of{' '}
          <Text style={styles.highlight}>adenosine triphosphate (ATP)</Text>, used as a source of chemical energy.
          Mitochondria are found in nearly all eukaryotic cells.
        </Text>
      )}
      {!rephrased && (
        <TouchableOpacity style={styles.rephraseBtn} onPress={onRephrase} disabled={loading}>
          {loading ? <ActivityIndicator color={GOLD} /> : <Text style={styles.rephraseBtnText}>✨  Rephrase for me (AI)</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

function WatchContent() {
  return (
    <View style={styles.contentCard}>
      <Text style={styles.contentTitle}>Video · The Cell Explained</Text>
      <View style={styles.videoThumb}>
        <Text style={{ fontSize: 44 }}>▶️</Text>
        <Text style={styles.videoCaption}>2:45 · Auto-captioned · Dyslexia-friendly</Text>
      </View>
      <View style={styles.videoChips}>
        <View style={styles.chip}><Text style={styles.chipText}>0.75× speed</Text></View>
        <View style={styles.chip}><Text style={styles.chipText}>Large captions</Text></View>
        <View style={styles.chip}><Text style={styles.chipText}>High contrast</Text></View>
      </View>
    </View>
  );
}

function QuizContent({ selected, onSelect }: { selected: number | null; onSelect: (i: number) => void }) {
  return (
    <View style={styles.contentCard}>
      <Text style={styles.contentTitle}>Quick Check ✏️</Text>
      <Text style={styles.quizQuestion}>What is the primary role of mitochondria?</Text>
      {QUIZ_OPTIONS.map((opt, i) => {
        const isCorrect = i === 0;
        const showResult = selected !== null;
        let bg = Colors.border;
        if (showResult && selected === i) bg = isCorrect ? '#d4f4e2' : '#fde8e8';
        if (showResult && isCorrect && selected !== i) bg = '#d4f4e2';
        return (
          <TouchableOpacity key={i} style={[styles.quizOption, { backgroundColor: bg }]} onPress={() => onSelect(i)} disabled={selected !== null}>
            <Text style={styles.quizOptionText}>{opt}</Text>
            {showResult && isCorrect && <Text style={styles.quizCheck}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function VoiceBar({ speaking, loading, onToggle }: { speaking: boolean; loading: boolean; onToggle: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (speaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.12, duration: 400, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scale.stopAnimation(); scale.setValue(1);
    }
  }, [speaking]);
  return (
    <View style={styles.voiceBar}>
      <View style={styles.voiceLeft}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={{ fontSize: 24 }}>{speaking ? '🔊' : '🎙️'}</Text>
        </Animated.View>
        <View>
          <Text style={styles.voiceTitle}>ElevenLabs Voice Guide</Text>
          <Text style={styles.voiceSub}>{speaking ? 'Speaking…' : 'Tap to hear a hint'}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.voiceBtn, speaking && styles.voiceBtnActive]} onPress={onToggle} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.voiceBtnText}>{speaking ? 'Stop' : 'Speak'}</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

const FOCUS_CYCLE: FocusLevel[] = ['high', 'medium', 'low'];

export default function FocusPathScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('read');
  const [focusLevel, setFocusLevel] = useState<FocusLevel>('high');
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [rephrased, setRephrased] = useState<string | null>(null);
  const [rephraseLoading, setRephraseLoading] = useState(false);
  const [hint, setHint] = useState('You’re doing great — keep going! 🌟');
  const [hintLoading, setHintLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const soundRef = useRef<any>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFaces = useCallback((faces: any[]) => {
    const next = faceToFocusLevel(faces);
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => setFocusLevel(next), 400);
  }, []);

  const cycleDemoFocus = () =>
    setFocusLevel((prev) => FOCUS_CYCLE[(FOCUS_CYCLE.indexOf(prev) + 1) % 3]);

  // Auto-adapt mode when focus drops
  useEffect(() => {
    if (focusLevel === 'low' && mode === 'read') setMode('watch');
  }, [focusLevel]);

  // Fetch AI hint on focus/mode change
  useEffect(() => {
    let cancelled = false;
    setHintLoading(true);
    api.getFocusHint(TOPIC, focusLevel, mode)
      .then(({ hint }) => { if (!cancelled) setHint(hint); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setHintLoading(false); });
    return () => { cancelled = true; };
  }, [focusLevel, mode]);

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync?.(); };
  }, []);

  async function handleRephrase() {
    setRephraseLoading(true);
    try {
      const { rephrased: text } = await api.rephraseContent(READ_TEXT, focusLevel);
      setRephrased(text);
    } catch (e) {
      console.error('rephrase error', e);
    } finally {
      setRephraseLoading(false);
    }
  }

  async function handleVoiceToggle() {
    if (speaking) {
      await soundRef.current?.stopAsync?.();
      setSpeaking(false);
      return;
    }
    if (!IS_NATIVE) {
      // Web: just show visual feedback, no audio
      setSpeaking(true);
      setTimeout(() => setSpeaking(false), 2500);
      return;
    }
    setVoiceLoading(true);
    try {
      const { audio_b64 } = await api.speakText(hint);
      const FileSystem = require('expo-file-system');
      const { Audio } = require('expo-av');
      const uri = FileSystem.cacheDirectory + 'focus_hint.mp3';
      await FileSystem.writeAsStringAsync(uri, audio_b64, { encoding: FileSystem.EncodingType.Base64 });
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      setSpeaking(true);
      sound.setOnPlaybackStatusUpdate((s: any) => { if (s.didJustFinish) setSpeaking(false); });
    } catch (e) {
      console.error('voice error', e);
    } finally {
      setVoiceLoading(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m); setQuizSelected(null); setRephrased(null);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerIcon}>🎯</Text>
          <Text style={styles.headerTitle}>FocusPath</Text>
        </View>
        <View style={styles.sessionChip}>
          <Text style={styles.sessionChipText}>Live session</Text>
        </View>
      </View>

      <Text style={styles.tagline}>Your adaptive learning companion</Text>
      <Text style={styles.taglineSub}>Attention tracking · Content AI · Voice guidance</Text>

      <CameraCard level={focusLevel} onFacesDetected={handleFaces} onDemoToggle={cycleDemoFocus} />
      <FocusMeter level={focusLevel} />

      {focusLevel !== 'high' && (
        <View style={[styles.adaptBanner, { borderColor: focusColor(focusLevel) }]}>
          <Text style={styles.adaptIcon}>🤖</Text>
          <Text style={styles.adaptText}>
            {focusLevel === 'low'
              ? 'Low focus detected — switching to video mode for you.'
              : 'Drifting detected — try the quiz to re-engage!'}
          </Text>
        </View>
      )}

      <ModeSelector mode={mode} onChange={switchMode} />

      {mode === 'read' && <ReadContent onRephrase={handleRephrase} loading={rephraseLoading} rephrased={rephrased} />}
      {mode === 'watch' && <WatchContent />}
      {mode === 'quiz' && <QuizContent selected={quizSelected} onSelect={setQuizSelected} />}

      <VoiceBar speaking={speaking} loading={voiceLoading} onToggle={handleVoiceToggle} />

      <View style={styles.hintCard}>
        <Text style={styles.hintLabel}>AI Hint</Text>
        {hintLoading ? <ActivityIndicator color={GOLD} /> : <Text style={styles.hintText}>{hint}</Text>}
      </View>

      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Session Progress</Text>
        <View style={styles.progressRow}>
          {['Intro', 'Cell 101', 'Mitochondria', 'DNA', 'Quiz'].map((step, i) => (
            <View key={step} style={styles.progressStep}>
              <View style={[styles.progressDot, i < 3 && { backgroundColor: '#4caf7d' }]}>
                {i < 3 && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
              </View>
              <Text style={styles.progressStepLabel}>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.accomCard}>
        <Text style={styles.accomTitle}>Active Accommodations</Text>
        <View style={styles.accomGrid}>
          {[
            { icon: '🔠', label: 'Dyslexia font' },
            { icon: '🎨', label: 'High contrast' },
            { icon: '⏸️', label: 'Auto-pause' },
            { icon: '🧩', label: 'Chunked text' },
          ].map(({ icon, label }) => (
            <View key={label} style={styles.accomChip}>
              <Text style={{ fontSize: 16 }}>{icon}</Text>
              <Text style={styles.accomChipText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const GOLD = '#C08A3A';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 56 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { padding: 8, marginRight: 4 },
  backArrow: { fontSize: 22, color: Colors.navy },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { fontSize: 22 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.navy },
  sessionChip: { backgroundColor: '#d4f4e2', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  sessionChipText: { fontSize: 12, color: '#2d7a52', fontWeight: '600' },

  tagline: { fontSize: 15, fontWeight: '600', color: Colors.textDark, marginBottom: 2 },
  taglineSub: { fontSize: 12, color: Colors.textMid, marginBottom: 20 },

  cameraCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 14, ...Shadow.sm },
  cameraFrame: {
    height: 180, borderRadius: Radius.md, overflow: 'hidden',
    backgroundColor: '#1a2535', marginBottom: 12, position: 'relative',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraCornerTL: { position: 'absolute', top: 10, left: 10, width: 18, height: 18, borderTopWidth: 2, borderLeftWidth: 2, borderColor: GOLD },
  cameraCornerTR: { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderTopWidth: 2, borderRightWidth: 2, borderColor: GOLD },
  cameraCornerBL: { position: 'absolute', bottom: 10, left: 10, width: 18, height: 18, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: GOLD },
  cameraCornerBR: { position: 'absolute', bottom: 10, right: 10, width: 18, height: 18, borderBottomWidth: 2, borderRightWidth: 2, borderColor: GOLD },
  faceSilhouette: { alignItems: 'center' },
  gazeDot: { position: 'absolute', bottom: 28, right: 52, width: 10, height: 10, borderRadius: 5, opacity: 0.85 },
  cameraInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cameraSubText: { fontSize: 11, color: Colors.textLight },
  permissionBtn: { backgroundColor: Colors.navy, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 10 },
  permissionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  debugBtn: { alignSelf: 'center', marginTop: 4 },
  debugBtnText: { fontSize: 11, color: Colors.textLight, textDecorationLine: 'underline' },

  attentionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  attentionDot: { width: 8, height: 8, borderRadius: 4 },
  attentionText: { fontSize: 12, fontWeight: '700' },

  meterWrap: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 10, ...Shadow.sm },
  meterLabel: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 8 },
  meterTrack: { height: 10, backgroundColor: Colors.border, borderRadius: Radius.full, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: Radius.full },
  meterValue: { fontSize: 13, fontWeight: '700', textAlign: 'right', marginTop: 6 },

  adaptBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fffbef', borderWidth: 1.5, borderRadius: Radius.md, padding: 12, marginBottom: 14 },
  adaptIcon: { fontSize: 20 },
  adaptText: { flex: 1, fontSize: 13, color: Colors.textDark },

  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  modeBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm },
  modeBtnActive: { borderColor: GOLD, backgroundColor: '#fdf3e3' },
  modeIcon: { fontSize: 20, marginBottom: 4 },
  modeLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMid },
  modeLabelActive: { color: GOLD },

  contentCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, marginBottom: 14, ...Shadow.sm },
  contentTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  contentBody: { fontSize: 15, lineHeight: 24, color: Colors.textDark },
  highlight: { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '600' },
  rephraseBtn: { marginTop: 14, backgroundColor: '#fdf3e3', borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#f0d9a8', minHeight: 40, justifyContent: 'center' },
  rephraseBtnText: { fontSize: 13, fontWeight: '700', color: GOLD },

  videoThumb: { height: 130, backgroundColor: '#1a2535', borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginBottom: 12, gap: 8 },
  videoCaption: { fontSize: 12, color: '#aab8c8' },
  videoChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: Colors.sageLight, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 11, color: '#3a7a5a', fontWeight: '600' },

  quizQuestion: { fontSize: 14, fontWeight: '600', color: Colors.textDark, marginBottom: 12 },
  quizOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  quizOptionText: { flex: 1, fontSize: 13, color: Colors.textDark },
  quizCheck: { fontSize: 16, color: '#2d7a52', fontWeight: '700', marginLeft: 8 },

  voiceBar: { backgroundColor: Colors.navy, borderRadius: Radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  voiceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  voiceTitle: { fontSize: 13, fontWeight: '700', color: Colors.white },
  voiceSub: { fontSize: 11, color: '#9aaabb', marginTop: 2 },
  voiceBtn: { backgroundColor: '#ffffff22', borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#ffffff44', minWidth: 64, alignItems: 'center' },
  voiceBtnActive: { backgroundColor: '#4caf7d44', borderColor: '#4caf7d' },
  voiceBtnText: { fontSize: 13, fontWeight: '700', color: Colors.white },

  hintCard: { backgroundColor: '#fdf3e3', borderRadius: Radius.lg, padding: 16, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: GOLD, minHeight: 64, justifyContent: 'center' },
  hintLabel: { fontSize: 11, fontWeight: '700', color: GOLD, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  hintText: { fontSize: 14, color: Colors.textDark },

  progressCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 14, ...Shadow.sm },
  progressTitle: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 14 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStep: { alignItems: 'center', gap: 6 },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  progressStepLabel: { fontSize: 10, color: Colors.textMid, textAlign: 'center' },

  accomCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 14, ...Shadow.sm },
  accomTitle: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 12 },
  accomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accomChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.lavender, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  accomChipText: { fontSize: 12, color: '#5a4a90', fontWeight: '600' },
});
