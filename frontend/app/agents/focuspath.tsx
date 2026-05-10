import { Colors, Radius, Shadow } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── types ───────────────────────────────────────────────────────────────────

type Mode = 'read' | 'watch' | 'quiz';
type FocusLevel = 'high' | 'medium' | 'low';

// ─── static data ─────────────────────────────────────────────────────────────

const MODES: { key: Mode; icon: string; label: string }[] = [
  { key: 'read', icon: '📖', label: 'Read' },
  { key: 'watch', icon: '🎬', label: 'Watch' },
  { key: 'quiz', icon: '✏️', label: 'Quiz' },
];

const QUIZ_OPTIONS = [
  'Mitochondria produce ATP via cellular respiration',
  'The nucleus controls protein synthesis',
  'Ribosomes are found only in the nucleus',
  'Cell membranes are made of a lipid monolayer',
];

const HINTS = [
  "You're doing great — keep going! 🌟",
  'Try breaking this into smaller chunks.',
  'Take a 30-second breath break — it helps!',
  'Highlight the key terms as you read.',
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function focusColor(level: FocusLevel) {
  if (level === 'high') return '#4caf7d';
  if (level === 'medium') return '#f5a623';
  return '#e05252';
}

function focusLabel(level: FocusLevel) {
  if (level === 'high') return 'High Focus';
  if (level === 'medium') return 'Drifting…';
  return 'Low Focus';
}

// ─── sub-components ──────────────────────────────────────────────────────────

function AttentionBadge({ level }: { level: FocusLevel }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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
  const width = level === 'high' ? '85%' : level === 'medium' ? '50%' : '22%';
  return (
    <View style={styles.meterWrap}>
      <Text style={styles.meterLabel}>Attention Score</Text>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width, backgroundColor: focusColor(level) }]} />
      </View>
      <Text style={[styles.meterValue, { color: focusColor(level) }]}>
        {level === 'high' ? '85' : level === 'medium' ? '50' : '22'} / 100
      </Text>
    </View>
  );
}

function CameraFeed({ level }: { level: FocusLevel }) {
  return (
    <View style={styles.cameraCard}>
      {/* Simulated camera frame */}
      <View style={styles.cameraFrame}>
        <View style={styles.cameraCornerTL} />
        <View style={styles.cameraCornerTR} />
        <View style={styles.cameraCornerBL} />
        <View style={styles.cameraCornerBR} />
        {/* Face silhouette */}
        <View style={styles.faceSilhouette}>
          <Text style={{ fontSize: 38 }}>🧑‍💻</Text>
        </View>
        {/* Gaze dot */}
        <View style={[styles.gazeDot, { backgroundColor: focusColor(level) }]} />
      </View>

      <View style={styles.cameraInfo}>
        <AttentionBadge level={level} />
        <Text style={styles.cameraSubText}>Webcam · Gesture & gaze tracking active</Text>
      </View>
    </View>
  );
}

function ModeSelector({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <View style={styles.modeRow}>
      {MODES.map(({ key, icon, label }) => {
        const active = mode === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.modeBtn, active && styles.modeBtnActive]}
            onPress={() => onChange(key)}
          >
            <Text style={styles.modeIcon}>{icon}</Text>
            <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ReadContent({ onRephrase }: { onRephrase: () => void }) {
  return (
    <View style={styles.contentCard}>
      <Text style={styles.contentTitle}>Biology · Chapter 4: The Cell</Text>
      <Text style={styles.contentBody}>
        The <Text style={styles.highlight}>mitochondria</Text> is often called the powerhouse of the
        cell. It generates most of the cell's supply of{' '}
        <Text style={styles.highlight}>adenosine triphosphate (ATP)</Text>, used as a source of
        chemical energy. Mitochondria are found in nearly all eukaryotic cells.
      </Text>
      <TouchableOpacity style={styles.rephraseBtn} onPress={onRephrase}>
        <Text style={styles.rephraseBtnText}>✨  Rephrase for me (AI)</Text>
      </TouchableOpacity>
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
        const isSelected = selected === i;
        const isCorrect = i === 0;
        const showResult = selected !== null;
        let bg = Colors.border;
        if (showResult && isSelected) bg = isCorrect ? '#d4f4e2' : '#fde8e8';
        if (showResult && isCorrect && !isSelected) bg = '#d4f4e2';
        return (
          <TouchableOpacity
            key={i}
            style={[styles.quizOption, { backgroundColor: bg }]}
            onPress={() => onSelect(i)}
            disabled={selected !== null}
          >
            <Text style={styles.quizOptionText}>{opt}</Text>
            {showResult && isCorrect && <Text style={styles.quizCheck}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function VoiceAssistantBar({ speaking, onToggle }: { speaking: boolean; onToggle: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (speaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.1, duration: 400, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scale.stopAnimation();
      scale.setValue(1);
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
          <Text style={styles.voiceSub}>
            {speaking ? 'Speaking hint…' : 'Tap to hear a hint or encouragement'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.voiceBtn, speaking && styles.voiceBtnActive]}
        onPress={onToggle}
      >
        <Text style={styles.voiceBtnText}>{speaking ? 'Stop' : 'Speak'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function FocusPathScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('read');
  const [focusLevel, setFocusLevel] = useState<FocusLevel>('high');
  const [speaking, setSpeaking] = useState(false);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [hint, setHint] = useState(HINTS[0]);
  const [rephrased, setRephrased] = useState(false);

  const focusLevels: FocusLevel[] = ['high', 'medium', 'low'];

  function cycleDebugFocus() {
    setFocusLevel((prev) => {
      const i = focusLevels.indexOf(prev);
      return focusLevels[(i + 1) % 3];
    });
  }

  function handleRephrase() {
    setRephrased(true);
  }

  function handleVoiceToggle() {
    setSpeaking((v) => !v);
    setHint(HINTS[Math.floor(Math.random() * HINTS.length)]);
  }

  // Auto-adapt: switch mode when focus drops low
  useEffect(() => {
    if (focusLevel === 'low' && mode === 'read') setMode('watch');
  }, [focusLevel]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* ── Header ── */}
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

      {/* ── Tagline ── */}
      <Text style={styles.tagline}>Your adaptive learning companion</Text>
      <Text style={styles.taglineSub}>
        Powered by attention tracking · content AI · voice guidance
      </Text>

      {/* ── Camera + attention ── */}
      <CameraFeed level={focusLevel} />

      {/* ── Focus meter ── */}
      <FocusMeter level={focusLevel} />

      {/* debug toggle — small, honest label */}
      <TouchableOpacity onPress={cycleDebugFocus} style={styles.debugBtn}>
        <Text style={styles.debugBtnText}>Simulate focus change ↻</Text>
      </TouchableOpacity>

      {/* ── AI adaptation banner ── */}
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

      {/* ── Mode selector ── */}
      <ModeSelector mode={mode} onChange={(m) => { setMode(m); setQuizSelected(null); setRephrased(false); }} />

      {/* ── Content area ── */}
      {mode === 'read' && (
        rephrased ? (
          <View style={[styles.contentCard, { borderLeftWidth: 4, borderLeftColor: '#C08A3A' }]}>
            <Text style={styles.contentTitle}>Rephrased by AI ✨</Text>
            <Text style={styles.contentBody}>
              Mitochondria are like tiny batteries inside your cells. They take food energy and turn
              it into something your body can actually use — a molecule called ATP. Almost every
              cell in your body has them.
            </Text>
          </View>
        ) : (
          <ReadContent onRephrase={handleRephrase} />
        )
      )}
      {mode === 'watch' && <WatchContent />}
      {mode === 'quiz' && <QuizContent selected={quizSelected} onSelect={setQuizSelected} />}

      {/* ── Voice assistant ── */}
      <VoiceAssistantBar speaking={speaking} onToggle={handleVoiceToggle} />

      {/* ── Hint card ── */}
      <View style={styles.hintCard}>
        <Text style={styles.hintLabel}>AI Hint</Text>
        <Text style={styles.hintText}>{hint}</Text>
      </View>

      {/* ── Progress strip ── */}
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

      {/* ── Accommodations strip ── */}
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

  // header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { padding: 8, marginRight: 4 },
  backArrow: { fontSize: 22, color: Colors.navy },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { fontSize: 22 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.navy },
  sessionChip: { backgroundColor: '#d4f4e2', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  sessionChipText: { fontSize: 12, color: '#2d7a52', fontWeight: '600' },

  // tagline
  tagline: { fontSize: 15, fontWeight: '600', color: Colors.textDark, marginBottom: 2 },
  taglineSub: { fontSize: 12, color: Colors.textMid, marginBottom: 20 },

  // camera
  cameraCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 14,
    ...Shadow.sm,
  },
  cameraFrame: {
    height: 170,
    backgroundColor: '#1a2535',
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 12,
  },
  cameraCornerTL: { position: 'absolute', top: 10, left: 10, width: 18, height: 18, borderTopWidth: 2, borderLeftWidth: 2, borderColor: GOLD },
  cameraCornerTR: { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderTopWidth: 2, borderRightWidth: 2, borderColor: GOLD },
  cameraCornerBL: { position: 'absolute', bottom: 10, left: 10, width: 18, height: 18, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: GOLD },
  cameraCornerBR: { position: 'absolute', bottom: 10, right: 10, width: 18, height: 18, borderBottomWidth: 2, borderRightWidth: 2, borderColor: GOLD },
  faceSilhouette: { alignItems: 'center' },
  gazeDot: { position: 'absolute', bottom: 28, right: 52, width: 10, height: 10, borderRadius: 5, opacity: 0.85 },
  cameraInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cameraSubText: { fontSize: 11, color: Colors.textLight },

  // attention badge
  attentionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  attentionDot: { width: 8, height: 8, borderRadius: 4 },
  attentionText: { fontSize: 12, fontWeight: '700' },

  // meter
  meterWrap: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 10, ...Shadow.sm },
  meterLabel: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 8 },
  meterTrack: { height: 10, backgroundColor: Colors.border, borderRadius: Radius.full, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: Radius.full },
  meterValue: { fontSize: 13, fontWeight: '700', textAlign: 'right', marginTop: 6 },

  // debug
  debugBtn: { alignSelf: 'center', marginBottom: 14 },
  debugBtnText: { fontSize: 11, color: Colors.textLight, textDecorationLine: 'underline' },

  // adapt banner
  adaptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fffbef',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 14,
  },
  adaptIcon: { fontSize: 20 },
  adaptText: { flex: 1, fontSize: 13, color: Colors.textDark },

  // mode selector
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  modeBtnActive: { borderColor: GOLD, backgroundColor: '#fdf3e3' },
  modeIcon: { fontSize: 20, marginBottom: 4 },
  modeLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMid },
  modeLabelActive: { color: GOLD },

  // content card
  contentCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 14,
    ...Shadow.sm,
  },
  contentTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  contentBody: { fontSize: 15, lineHeight: 24, color: Colors.textDark },
  highlight: { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '600' },
  rephraseBtn: {
    marginTop: 14,
    backgroundColor: '#fdf3e3',
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0d9a8',
  },
  rephraseBtnText: { fontSize: 13, fontWeight: '700', color: GOLD },

  // video
  videoThumb: {
    height: 130,
    backgroundColor: '#1a2535',
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  videoCaption: { fontSize: 12, color: '#aab8c8' },
  videoChips: { flexDirection: 'row', gap: 8 },
  chip: { backgroundColor: Colors.sageLight, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 11, color: '#3a7a5a', fontWeight: '600' },

  // quiz
  quizQuestion: { fontSize: 14, fontWeight: '600', color: Colors.textDark, marginBottom: 12 },
  quizOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quizOptionText: { flex: 1, fontSize: 13, color: Colors.textDark },
  quizCheck: { fontSize: 16, color: '#2d7a52', fontWeight: '700', marginLeft: 8 },

  // voice
  voiceBar: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  voiceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  voiceTitle: { fontSize: 13, fontWeight: '700', color: Colors.white },
  voiceSub: { fontSize: 11, color: '#9aaabb', marginTop: 2 },
  voiceBtn: { backgroundColor: '#ffffff22', borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#ffffff44' },
  voiceBtnActive: { backgroundColor: '#4caf7d44', borderColor: '#4caf7d' },
  voiceBtnText: { fontSize: 13, fontWeight: '700', color: Colors.white },

  // hint
  hintCard: {
    backgroundColor: '#fdf3e3',
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
  },
  hintLabel: { fontSize: 11, fontWeight: '700', color: GOLD, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  hintText: { fontSize: 14, color: Colors.textDark },

  // progress
  progressCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 14, ...Shadow.sm },
  progressTitle: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 14 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStep: { alignItems: 'center', gap: 6 },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepLabel: { fontSize: 10, color: Colors.textMid, textAlign: 'center' },

  // accommodations
  accomCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 14, ...Shadow.sm },
  accomTitle: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 12 },
  accomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.lavender,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  accomChipText: { fontSize: 12, color: '#5a4a90', fontWeight: '600' },
});
