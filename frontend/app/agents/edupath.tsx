import { Colors, Radius, Shadow } from '@/constants/theme';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const ACCENT = '#C08A3A';
const ACCENT_BG = '#fdf3e3';

const MODULES = [
  { title: 'Introduction to Psychology', format: 'Video', done: true, time: '18 min' },
  { title: 'Memory & Learning Theories', format: 'Quiz', done: true, time: '12 min' },
  { title: 'Cognitive Development', format: 'Text', done: true, time: '22 min' },
  { title: 'Attention & Focus Models', format: 'Video', done: true, time: '15 min' },
  { title: 'Social Influence & Behavior', format: 'Text', done: false, time: '20 min' },
  { title: 'Emotion & Motivation', format: 'Quiz', done: false, time: '14 min' },
  { title: 'Final Review', format: 'Adaptive', done: false, time: '30 min' },
];

const FORMAT_ICONS: Record<string, string> = {
  Video: '🎬', Quiz: '✏️', Text: '📄', Adaptive: '🔀',
};

interface Msg { role: 'assistant' | 'user'; text: string }

function LearningSession({ module, onClose }: { module: typeof MODULES[0]; onClose: () => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: `Let's study **${module.title}** together! 🎯\n\nI'll adapt to how you learn best — ask me anything, request a quiz, or tap a quick action below.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const CHIPS = [
    { label: '🔤 Explain Simply', msg: `Explain "${module.title}" in simple terms I can understand quickly.` },
    { label: '✏️ Quiz Me', msg: `Give me a short 3-question quiz on "${module.title}".` },
    { label: '💡 Give a Hint', msg: `Give me one key insight about "${module.title}" that's easy to remember.` },
    { label: '🔊 Voice Summary', msg: `Summarize "${module.title}" in 3 bullet points I can read aloud.` },
  ];

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const context = `[FocusPath Learning Session — Module: "${module.title}", Format: ${module.format}] `;
      const { reply } = await api.chat(context + userMsg);
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: mockReply(userMsg, module.title) }]);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <View style={sess.container}>
      {/* Header */}
      <View style={sess.header}>
        <View style={sess.headerLeft}>
          <View style={sess.headerIcon}><Text style={{ fontSize: 20 }}>🎯</Text></View>
          <View>
            <Text style={sess.headerTitle}>FocusPath · Learning Session</Text>
            <Text style={sess.headerSub} numberOfLines={1}>{module.title}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={sess.closeBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Format badge */}
      <View style={sess.modeBadge}>
        <Text style={sess.modeBadgeText}>{FORMAT_ICONS[module.format]} {module.format} Mode · Adapting to your focus</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={sess.messages}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m, i) => (
          <View key={i} style={[sess.row, m.role === 'user' && sess.rowUser]}>
            {m.role === 'assistant' && (
              <View style={sess.avatar}><Text style={{ fontSize: 14 }}>🎯</Text></View>
            )}
            <View style={[sess.bubble, m.role === 'user' ? sess.bubbleUser : sess.bubbleBot]}>
              <Text style={[sess.bubbleText, m.role === 'user' && { color: Colors.white }]}>{m.text}</Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={sess.row}>
            <View style={sess.avatar}><Text style={{ fontSize: 14 }}>🎯</Text></View>
            <View style={sess.bubbleBot}><Text style={sess.bubbleText}>Thinking…</Text></View>
          </View>
        )}
      </ScrollView>

      {/* Quick action chips */}
      <View style={sess.chips}>
        {CHIPS.map((c) => (
          <TouchableOpacity key={c.label} style={sess.chip} onPress={() => send(c.msg)}>
            <Text style={sess.chipText}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={sess.inputRow}>
          <TextInput
            style={sess.input}
            placeholder="Ask anything about this topic…"
            placeholderTextColor={Colors.textLight}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={[sess.sendBtn, { opacity: loading ? 0.5 : 1 }]}
            onPress={() => send(input)}
            disabled={loading}
          >
            <Text style={{ color: Colors.white, fontSize: 16 }}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function mockReply(text: string, module: string): string {
  const t = text.toLowerCase();
  if (t.includes('quiz')) return `Here's a quick quiz on ${module}:\n\n1. What is the core concept of ${module}?\n2. How does this topic apply to everyday life?\n3. Name one key theorist or framework related to this subject.\n\nTake your time — there are no wrong answers in learning! ✏️`;
  if (t.includes('simple') || t.includes('explain')) return `Here's ${module} in simple terms:\n\nThink of it like this — it's the study of how people think, feel, and behave. At its core, it helps us understand patterns in human experience.\n\nThe key takeaway: every concept in this module connects to real life situations you already know. 🔤`;
  if (t.includes('hint') || t.includes('key')) return `💡 Key insight for ${module}:\n\nFocus on understanding the "why" behind the concepts, not just the names. When you connect new ideas to things you already know, they stick much better.\n\nTip: Try explaining it in one sentence to yourself!`;
  if (t.includes('summary') || t.includes('bullet')) return `📋 ${module} — 3 key points:\n\n• Core idea: Understanding patterns in human thought and behavior\n• Why it matters: Applies directly to parenting, relationships, and work\n• Remember: Theory + real-life examples = lasting knowledge`;
  return `Great question about ${module}! This is a rich topic that connects to many areas of life.\n\nTry asking me to "explain simply," "quiz me," or "give a hint" — I'll adapt based on what helps you most right now. 🎯`;
}

export default function FocusPathScreen() {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<typeof MODULES[0] | null>(null);

  const done = MODULES.filter((m) => m.done).length;
  const pct = Math.round((done / MODULES.length) * 100);
  const next = MODULES.find((m) => !m.done);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.iconWrap}>
            <Text style={{ fontSize: 28 }}>🎯</Text>
          </View>
          <Text style={styles.headerTitle}>FocusPath Agent</Text>
          <Text style={styles.headerSub}>Adaptive learning companion</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Course Progress</Text>
            <Text style={[styles.pct, { color: ACCENT }]}>{pct}%</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.meta}>{done} of {MODULES.length} modules complete</Text>
          <View style={[styles.badge, { backgroundColor: ACCENT_BG }]}>
            <View style={[styles.dot, { backgroundColor: ACCENT }]} />
            <Text style={[styles.badgeText, { color: ACCENT }]}>Attention mode: active — adapting content to your focus</Text>
          </View>
        </View>

        {/* Up Next */}
        {next && (
          <TouchableOpacity style={[styles.nextCard, { borderLeftColor: ACCENT }]} onPress={() => setActiveModule(next)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>Up Next</Text>
              <Text style={styles.nextTitle}>{next.title}</Text>
              <Text style={styles.nextMeta}>{FORMAT_ICONS[next.format]} {next.format} · {next.time}</Text>
            </View>
            <View style={[styles.startBtn, { backgroundColor: ACCENT }]}>
              <Text style={styles.startText}>Start →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Features */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How FocusPath Helps You</Text>
          {[
            { icon: '🎙️', title: 'Voice Mode', desc: 'Hands-free learning while caring for your little one' },
            { icon: '🔀', title: 'Auto-adapt', desc: 'Switches format when your focus dips — text → video → quiz' },
            { icon: '✨', title: 'AI Rephrase', desc: 'Tap any concept to get a simpler explanation instantly' },
          ].map((h, i, arr) => (
            <View key={i} style={[styles.hintRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.hintIcon, { backgroundColor: ACCENT_BG }]}>
                <Text style={{ fontSize: 18 }}>{h.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hintTitle}>{h.title}</Text>
                <Text style={styles.hintDesc}>{h.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Module list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>All Modules</Text>
          {MODULES.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.module, i === MODULES.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => setActiveModule(m)}
            >
              <View style={[styles.check, m.done && { backgroundColor: ACCENT, borderColor: ACCENT }]}>
                {m.done && <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '700' }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.moduleTitle, m.done && styles.moduleDone]}>{m.title}</Text>
                <Text style={styles.moduleMeta}>{FORMAT_ICONS[m.format]} {m.format} · {m.time}</Text>
              </View>
              <Text style={{ color: Colors.textLight, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Learning Session Modal */}
      <Modal visible={!!activeModule} animationType="slide" presentationStyle="pageSheet">
        {activeModule && (
          <LearningSession module={activeModule} onClose={() => setActiveModule(null)} />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.navy, paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 },
  backBtn: { marginBottom: 16 },
  backText: { color: Colors.sage, fontSize: 16, fontWeight: '600' },
  headerContent: { alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: ACCENT_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: Colors.textLight },
  content: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  pct: { fontSize: 15, fontWeight: '700' },
  bar: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 10, overflow: 'hidden', marginBottom: 8 },
  fill: { height: '100%', backgroundColor: ACCENT, borderRadius: 10 },
  meta: { fontSize: 12, color: Colors.textMid, marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', flex: 1 },
  nextCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 14, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, gap: 12 },
  nextLabel: { fontSize: 10, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  nextTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  nextMeta: { fontSize: 12, color: Colors.textMid },
  startBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  startText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  hintIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hintTitle: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  hintDesc: { fontSize: 12, color: Colors.textMid, marginTop: 2 },
  module: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  moduleTitle: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  moduleDone: { color: Colors.textLight, textDecorationLine: 'line-through' },
  moduleMeta: { fontSize: 11, color: Colors.textMid, marginTop: 2 },
});

const sess = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 18, paddingHorizontal: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: ACCENT_BG, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 13, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', maxWidth: 200 },
  closeBtn: { color: 'rgba(255,255,255,0.6)', fontSize: 20 },
  modeBadge: { backgroundColor: ACCENT_BG, paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#edd9b0' },
  modeBadgeText: { fontSize: 12, color: ACCENT, fontWeight: '600', textAlign: 'center' },
  messages: { flex: 1, backgroundColor: Colors.cream },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: ACCENT_BG, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleBot: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, ...Shadow.sm },
  bubbleUser: { backgroundColor: Colors.navy, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 13.5, color: Colors.textDark, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  chip: { backgroundColor: ACCENT_BG, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: '#edd9b0' },
  chipText: { fontSize: 12, color: ACCENT, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13.5, color: Colors.textDark, backgroundColor: Colors.cream, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, backgroundColor: ACCENT, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
