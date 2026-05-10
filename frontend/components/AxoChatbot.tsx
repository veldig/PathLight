import { Colors, Radius, Shadow } from '@/constants/theme';
import { api } from '@/lib/api';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Message { role: 'bot' | 'user'; text: string }

const MOTIVATIONS = [
  "You're doing something incredible — balancing school, family, and your future. Every step forward, no matter how small, is progress. You've got this! 💪",
  "Remember why you started. The road is hard, but you are harder. Keep going — your future self is cheering you on! 🌟",
  "You are proof that it's never too late to chase your dreams. Each day you show up is a win. Don't stop now! 🔥",
  "Juggling everything you do takes real strength. You're not just surviving — you're building something amazing for you and your family. 🏆",
  "Hard days don't last, but the progress you make does. Take a breath, then take the next step. One day at a time! 🌱",
  "You chose to invest in yourself, and that is one of the bravest things anyone can do. Be proud of how far you've already come! ✨",
  "Even on the tough days, you keep going. That's not ordinary — that's extraordinary. Your resilience is your superpower! ⚡",
  "Every sacrifice you make today is a seed planted for tomorrow. Your family will look back and see the courage it took to get here. 🌻",
  "You don't have to have it all figured out. Showing up is enough. Progress, not perfection — always. 🎯",
  "The fact that you're here, trying, learning, and growing means you've already won the hardest part. Keep that momentum! 🚀",
  "You carry so much, yet you still move forward. That kind of strength is rare — and it's going to take you exactly where you need to be. 🦋",
  "Doubt is normal. Fear is normal. But so is your ability to push through them. You've done it before and you'll do it again! 🌊",
];

function getMockReply(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('fundfinder') || t.includes('fund')) return "FundFinder scans thousands of grants, scholarships, and government aid programs to find ones you qualify for — then helps you apply automatically. 💰";
  if (t.includes('scholarship')) return "I found 3 scholarships you may qualify for: the Student Parent Scholarship ($2,500), the Single Parent Alliance Grant ($1,000), and the Community College Success Award ($750). Want me to start an application? 🎓";
  if (t.includes('motivation') || t.includes('motivat')) return MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
  if (t.includes('focuspath') || t.includes('focus') || t.includes('education') || t.includes('class') || t.includes('study')) return "FocusPath detects your focus level in real time, rephrases tough content to make it easier to process, and switches between text, video, or quiz mode to keep you learning effectively. 🎯";
  if (t.includes('career') || t.includes('job')) return "CareerBoost is scanning for flexible, remote-friendly jobs that match your skills and availability. I can also help write your cover letter! 💼";
  if (t.includes('wellness') || t.includes('stress') || t.includes('mental')) return "It's okay to feel overwhelmed sometimes. WellnessGuide connects you with free counseling, daily check-ins, and local support resources. Want to start a quick check-in? 🧠";
  return "Great question! I'm Axo, your PathLight guide. I can help you find scholarships, plan your education, discover jobs, or just be here to listen. What would you like to explore? 🦎";
}

const SUGGESTIONS = ['How does FundFinder work?', 'Find me a scholarship', 'I need motivation 💪'];

export default function AxoChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "Hey! I'm Axo 🦎 I'm here to help you navigate PathLight. What would you like to know?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const { reply } = await api.chat(text);
      setMessages((m) => [...m, { role: 'bot', text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: getMockReply(text) }]);
      // getMockReply is a fallback when the backend is unreachable
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <TouchableOpacity style={styles.fab} onPress={() => setOpen(true)}>
        <Text style={styles.fabEmoji}>🦎</Text>
        <View style={styles.fabPing}><Text style={{ color: 'white', fontSize: 8, fontWeight: '700' }}>1</Text></View>
      </TouchableOpacity>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.panel}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}><Text style={{ fontSize: 20 }}>🦎</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>Axo · PathLight Guide</Text>
          <Text style={styles.headerStatus}>● Online · Always here for you</Text>
        </View>
        <TouchableOpacity onPress={() => setOpen(false)}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 20 }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView style={styles.messages} contentContainerStyle={{ gap: 10, padding: 12 }}>
        {messages.map((m, i) => (
          <View key={i} style={[styles.msgRow, m.role === 'user' && styles.msgRowUser]}>
            {m.role === 'bot' && <View style={styles.msgAvatar}><Text style={{ fontSize: 13 }}>🦎</Text></View>}
            <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
              <Text style={[styles.bubbleText, m.role === 'user' && { color: Colors.white }]}>{m.text}</Text>
            </View>
            {m.role === 'user' && (
              <View style={[styles.msgAvatar, { backgroundColor: Colors.navy }]}>
                <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '700' }}>M</Text>
              </View>
            )}
          </View>
        ))}
        {loading && (
          <View style={styles.msgRow}>
            <View style={styles.msgAvatar}><Text style={{ fontSize: 13 }}>🦎</Text></View>
            <View style={styles.bubbleBot}><Text style={styles.bubbleText}>Thinking…</Text></View>
          </View>
        )}
      </ScrollView>

      {/* Suggestions */}
      <View style={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => send(s)}>
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask Axo anything…"
          placeholderTextColor={Colors.textLight}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={() => send(input)}>
          <Text style={{ color: Colors.white, fontSize: 14 }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: Colors.sage,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.lg,
  },
  fabEmoji: { fontSize: 28 },
  fabPing: {
    position: 'absolute', top: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.terracotta,
    borderWidth: 2, borderColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  panel: {
    position: 'absolute', right: 16, bottom: 16,
    width: 300, maxHeight: 480,
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    ...Shadow.lg, overflow: 'hidden',
  },
  header: { backgroundColor: Colors.navy, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.sage, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 13, fontWeight: '700', color: Colors.white },
  headerStatus: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  messages: { backgroundColor: Colors.cream, maxHeight: 220 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  msgRowUser: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.sageLight, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: 200, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 },
  bubbleBot: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, ...Shadow.sm },
  bubbleUser: { backgroundColor: Colors.navy, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 12.5, color: Colors.textDark, lineHeight: 18 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  suggestionChip: { backgroundColor: Colors.lavender, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  suggestionText: { fontSize: 11, color: '#5a4a90', fontWeight: '500' },
  inputRow: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 12.5, color: Colors.textDark, backgroundColor: Colors.cream,
  },
  sendBtn: { width: 34, height: 34, backgroundColor: Colors.navy, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
