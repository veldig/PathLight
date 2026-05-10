import { api, Therapist } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

// ─── Colors ───────────────────────────────────────────────────────────────────
const PURPLE = Colors.lavenderMid;
const PURPLE_BG = Colors.lavender;
const DARK = '#1a1030';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'chat' | 'voice' | 'therapists';
interface Message { id: string; role: 'user' | 'assistant'; content: string; }

// ─── Seed therapists (shown while API loads) ──────────────────────────────────
const SEED_THERAPISTS: Therapist[] = [
  { id: '1', name: 'Dr. Sarah Chen', title: 'Licensed Clinical Psychologist', platform: 'BetterHelp', specialties: ['Anxiety', 'Postpartum', 'Single Parents'], price_per_session: 65, accepts_insurance: true, telehealth: true, bio: 'Specializes in supporting student parents navigating academic stress, postpartum challenges, and work-life balance.', booking_url: 'https://betterhelp.com', next_available: 'Tomorrow', years_experience: 9, rating: 4.9 },
  { id: '2', name: 'Marcus Williams, LCSW', title: 'Licensed Clinical Social Worker', platform: 'Open Path', specialties: ['Depression', 'Stress', 'Family Dynamics'], price_per_session: 40, accepts_insurance: false, telehealth: true, bio: 'Works with overwhelmed caregivers and non-traditional students on sustainable coping strategies.', booking_url: 'https://openpathcollective.org', next_available: 'This week', years_experience: 7, rating: 4.8 },
  { id: '3', name: 'Aisha Patel, LPC', title: 'Licensed Professional Counselor', platform: 'Talkspace', specialties: ['Burnout', 'Self-esteem', 'Cultural Identity'], price_per_session: 55, accepts_insurance: true, telehealth: true, bio: 'Culturally competent therapist with expertise in burnout recovery and identity challenges for student mothers.', booking_url: 'https://talkspace.com', next_available: 'Today', years_experience: 5, rating: 4.7 },
];

const SPECIALTY_FILTERS = ['All', 'Anxiety', 'Depression', 'Postpartum', 'Stress', 'Burnout', 'Family'];

const VOICE_PROMPTS = [
  "I'm feeling overwhelmed today",
  "I'm struggling to balance school and parenting",
  "I feel like I'm not good enough",
  "I'm anxious about my future",
  "I just need someone to talk to",
  "I feel lonely and unsupported",
];

// ─── Audio helpers ────────────────────────────────────────────────────────────
async function playAudioB64(b64: string, onDone: () => void): Promise<Audio.Sound | null> {
  if (Platform.OS === 'web') {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new (window as any).Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); onDone(); };
    audio.onerror = () => { URL.revokeObjectURL(url); onDone(); };
    await audio.play();
    return null;
  }
  const uri = FileSystem.cacheDirectory + 'aria_voice.mp3';
  await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
  sound.setOnPlaybackStatusUpdate(s => {
    if ('didJustFinish' in s && s.didJustFinish) onDone();
  });
  return sound;
}

// ─── Pulsing Orb ─────────────────────────────────────────────────────────────
function PulsingOrb({ state }: { state: 'idle' | 'thinking' | 'speaking' }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (state === 'idle') {
      Animated.loop(Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.08, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(opacity, { toValue: 0.9, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.0, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(opacity, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        ]),
      ])).start();
    } else if (state === 'thinking') {
      Animated.loop(Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.95, duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      Animated.loop(Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 300, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0, duration: 300, useNativeDriver: true }),
      ])).start();
    }
    return () => { scale.stopAnimation(); opacity.stopAnimation(); };
  }, [state]);

  const color = state === 'idle' ? PURPLE : state === 'thinking' ? '#f0a500' : '#14F195';
  const label = state === 'idle' ? 'Aria is here' : state === 'thinking' ? 'Thinking…' : 'Speaking…';

  return (
    <View style={{ alignItems: 'center', marginVertical: 32 }}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <View style={[styles.orbOuter, { borderColor: color + '55' }]}>
          <View style={[styles.orbInner, { backgroundColor: color + '22', borderColor: color + '88' }]}>
            <Text style={{ fontSize: 42 }}>🧠</Text>
          </View>
        </View>
      </Animated.View>
      <Text style={[styles.orbLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Therapist Card ───────────────────────────────────────────────────────────
function TherapistCard({ t }: { t: Therapist }) {
  return (
    <View style={styles.therapistCard}>
      <View style={styles.therapistHeader}>
        <View style={styles.therapistAvatar}>
          <Text style={{ fontSize: 22 }}>🧑‍⚕️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.therapistName}>{t.name}</Text>
          <Text style={styles.therapistTitle}>{t.title}</Text>
          <Text style={styles.therapistPlatform}>via {t.platform}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.therapistPrice}>${t.price_per_session}</Text>
          <Text style={styles.therapistPriceSub}>/session</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 }}>
        {t.specialties.slice(0, 3).map((s, i) => (
          <View key={i} style={styles.specialtyChip}>
            <Text style={styles.specialtyChipText}>{s}</Text>
          </View>
        ))}
        {t.accepts_insurance && (
          <View style={[styles.specialtyChip, { backgroundColor: '#e8f5e9' }]}>
            <Text style={[styles.specialtyChipText, { color: '#27ae60' }]}>Insurance ✓</Text>
          </View>
        )}
      </View>
      <Text style={styles.therapistBio} numberOfLines={2}>{t.bio}</Text>
      <View style={styles.therapistFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, color: '#f0a500' }}>★</Text>
          <Text style={styles.therapistRating}>{t.rating}</Text>
          <Text style={styles.therapistMeta}> · {t.years_experience}y exp · Next: {t.next_available}</Text>
        </View>
        <TouchableOpacity style={styles.bookBtn} onPress={() => Linking.openURL(t.booking_url)}>
          <Text style={styles.bookBtnText}>Book →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WellnessScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  // ── Chat state ──
  const chatScrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([{
    id: '0',
    role: 'assistant',
    content: "Hi, I'm Aria 🌸 I'm here to support you. Being a student parent is incredibly hard — I want you to know you don't have to carry it alone. How are you feeling today?",
  }]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // ── Voice session state ──
  const [voiceState, setVoiceState] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const [voiceInput, setVoiceInput] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const [voiceHistory, setVoiceHistory] = useState<Array<{ role: string; content: string }>>([]);
  const voiceSoundRef = useRef<Audio.Sound | null>(null);
  const voiceScrollRef = useRef<ScrollView>(null);

  // ── Therapist state ──
  const [therapists, setTherapists] = useState<Therapist[]>(SEED_THERAPISTS);
  const [therapistLoading, setTherapistLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSpecialty, setActiveSpecialty] = useState('All');
  const [therapistError, setTherapistError] = useState('');

  // ── Effects ──
  useEffect(() => {
    if (activeTab === 'therapists' && therapists === SEED_THERAPISTS) loadTherapists();
  }, [activeTab]);

  useEffect(() => {
    chatScrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    voiceScrollRef.current?.scrollToEnd({ animated: true });
  }, [voiceTranscript]);

  // ── Chat handlers ──
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const { reply } = await api.wellnessChat(text, history);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: "I'm having trouble connecting right now. Please try again in a moment. 💙" }]);
    } finally {
      setChatLoading(false);
    }
  };

  const speakMessage = async (msg: Message) => {
    if (speakingId === msg.id) {
      await soundRef.current?.stopAsync();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(msg.id);
    try {
      const { audio_b64, error } = await api.wellnessSpeak(msg.content);
      if (!audio_b64 || error) { setSpeakingId(null); return; }
      if (soundRef.current) await soundRef.current.stopAsync();
      const s = await playAudioB64(audio_b64, () => setSpeakingId(null));
      if (s) soundRef.current = s;
    } catch { setSpeakingId(null); }
  };

  // ── Voice session handlers ──
  const sendVoiceMessage = async (text?: string) => {
    const msg = (text ?? voiceInput).trim();
    if (!msg || voiceState !== 'idle') return;
    setVoiceInput('');
    setVoiceTranscript(prev => [...prev, { role: 'user', text: msg }]);
    setVoiceState('thinking');

    const newHistory = [...voiceHistory, { role: 'user', content: msg }];
    try {
      const { reply } = await api.wellnessChat(msg, voiceHistory);
      setVoiceHistory([...newHistory, { role: 'assistant', content: reply }]);
      setVoiceTranscript(prev => [...prev, { role: 'assistant', text: reply }]);

      const { audio_b64, error } = await api.wellnessSpeak(reply);
      if (audio_b64 && !error) {
        setVoiceState('speaking');
        if (voiceSoundRef.current) await voiceSoundRef.current.stopAsync();
        const s = await playAudioB64(audio_b64, () => setVoiceState('idle'));
        if (s) voiceSoundRef.current = s;
      } else {
        setVoiceState('idle');
      }
    } catch {
      setVoiceTranscript(prev => [...prev, { role: 'assistant', text: "I'm having trouble connecting. Please try again. 💙" }]);
      setVoiceState('idle');
    }
  };

  // ── Therapist handlers ──
  const loadTherapists = async (query?: string) => {
    setTherapistLoading(true);
    setTherapistError('');
    try {
      const params: any = {};
      if (activeSpecialty !== 'All') params.specialty = activeSpecialty;
      const result = query
        ? await api.searchTherapists(query)
        : await api.getTherapists(params);
      const list = (result as any).therapists ?? [];
      setTherapists(list.length > 0 ? list : SEED_THERAPISTS);
    } catch {
      setTherapistError('Could not load therapists. Showing sample listings.');
      setTherapists(SEED_THERAPISTS);
    } finally {
      setTherapistLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) loadTherapists(searchQuery.trim());
    else loadTherapists();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: DARK }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 10 }}>
          <Text style={{ color: PURPLE, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.headerIcon, { backgroundColor: PURPLE_BG }]}>
            <Text style={{ fontSize: 26 }}>🧠</Text>
          </View>
          <Text style={styles.headerTitle}>WellnessGuide</Text>
          <Text style={styles.headerSub}>AI companion · Voice therapy · Real therapists</Text>
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        {([
          { id: 'chat', label: '🧠 Talk to Aria' },
          { id: 'voice', label: '🎙️ Voice Session' },
          { id: 'therapists', label: '🩺 Therapists' },
        ] as { id: Tab; label: string }[]).map(t => (
          <TouchableOpacity key={t.id} style={[styles.tab, activeTab === t.id && styles.tabActive]} onPress={() => setActiveTab(t.id)}>
            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ══════════════ CHAT TAB ══════════════ */}
      {activeTab === 'chat' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={chatScrollRef} style={{ flex: 1 }} contentContainerStyle={styles.chatContent}>
            {messages.map(msg => (
              <View key={msg.id} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
                {msg.role === 'assistant' && (
                  <View style={styles.msgAvatar}><Text style={{ fontSize: 16 }}>🧠</Text></View>
                )}
                <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
                  <Text style={[styles.bubbleText, msg.role === 'user' && { color: '#fff' }]}>{msg.content}</Text>
                  {msg.role === 'assistant' && (
                    <TouchableOpacity style={styles.speakBtn} onPress={() => speakMessage(msg)}>
                      <Text style={{ fontSize: 12, color: speakingId === msg.id ? PURPLE : Colors.textLight }}>
                        {speakingId === msg.id ? '🔊 Speaking…' : '🔊 Speak'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            {chatLoading && (
              <View style={styles.msgRow}>
                <View style={styles.msgAvatar}><Text style={{ fontSize: 16 }}>🧠</Text></View>
                <View style={[styles.bubble, styles.bubbleAI]}>
                  <View style={styles.typingDots}>
                    {[0, 1, 2].map(i => <View key={i} style={styles.typingDot} />)}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Crisis resource bar */}
          <View style={styles.crisisBar}>
            <Text style={styles.crisisText}>🆘 Crisis? Call or text </Text>
            <TouchableOpacity onPress={() => Linking.openURL('tel:988')}>
              <Text style={[styles.crisisText, { color: Colors.terracotta, fontWeight: '700' }]}>988</Text>
            </TouchableOpacity>
            <Text style={styles.crisisText}> anytime — free & confidential</Text>
          </View>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.chatInput}
              placeholder="Share what's on your mind…"
              placeholderTextColor={Colors.textLight}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]} onPress={sendMessage} disabled={!input.trim() || chatLoading}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>→</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ══════════════ VOICE TAB ══════════════ */}
      {activeTab === 'voice' && (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: DARK }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={voiceScrollRef} style={{ flex: 1 }} contentContainerStyle={styles.voiceContent}>

            <PulsingOrb state={voiceState} />

            <Text style={styles.voiceTitle}>Voice Therapy Session</Text>
            <Text style={styles.voiceSub}>
              Aria will speak her responses aloud via ElevenLabs. Choose a prompt or type your own.
            </Text>

            {/* Quick prompts */}
            {voiceTranscript.length === 0 && (
              <View style={styles.promptGrid}>
                {VOICE_PROMPTS.map((p, i) => (
                  <TouchableOpacity key={i} style={styles.promptChip} onPress={() => sendVoiceMessage(p)} disabled={voiceState !== 'idle'}>
                    <Text style={styles.promptChipText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Transcript */}
            {voiceTranscript.map((t, i) => (
              <View key={i} style={[styles.voiceMsg, t.role === 'user' && styles.voiceMsgUser]}>
                <Text style={styles.voiceMsgLabel}>{t.role === 'user' ? 'You' : 'Aria 🧠'}</Text>
                <Text style={[styles.voiceMsgText, t.role === 'user' && { color: '#fff' }]}>{t.text}</Text>
              </View>
            ))}

            {voiceState === 'thinking' && (
              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <ActivityIndicator color={PURPLE} />
                <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>Aria is thinking…</Text>
              </View>
            )}
          </ScrollView>

          {/* Crisis bar */}
          <View style={[styles.crisisBar, { backgroundColor: '#1a0533' }]}>
            <Text style={[styles.crisisText, { color: '#9ca3af' }]}>🆘 Crisis? </Text>
            <TouchableOpacity onPress={() => Linking.openURL('tel:988')}>
              <Text style={[styles.crisisText, { color: Colors.terracotta, fontWeight: '700' }]}>Call/text 988</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputBar, { backgroundColor: '#120a24', borderTopColor: PURPLE + '33' }]}>
            <TextInput
              style={[styles.chatInput, { backgroundColor: '#1f1040', color: '#fff', borderColor: PURPLE + '44' }]}
              placeholder="Or type your own message…"
              placeholderTextColor="#6b5b8a"
              value={voiceInput}
              onChangeText={setVoiceInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: PURPLE }, (!voiceInput.trim() || voiceState !== 'idle') && { opacity: 0.4 }]}
              onPress={() => sendVoiceMessage()}
              disabled={!voiceInput.trim() || voiceState !== 'idle'}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>→</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ══════════════ THERAPISTS TAB ══════════════ */}
      {activeTab === 'therapists' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

          {/* Search */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, specialty, or concern…"
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Search</Text>
            </TouchableOpacity>
          </View>

          {/* Specialty filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
              {SPECIALTY_FILTERS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterChip, activeSpecialty === s && { backgroundColor: PURPLE, borderColor: PURPLE }]}
                  onPress={() => { setActiveSpecialty(s); loadTherapists(); }}
                >
                  <Text style={[styles.filterChipText, activeSpecialty === s && { color: '#fff' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Affordable resources banner */}
          <View style={[styles.resourceBanner, { borderLeftColor: PURPLE }]}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 4 }}>💡 Low-cost options</Text>
            <Text style={{ fontSize: 12, color: Colors.textMid }}>Open Path Collective: $30–$80 · BetterHelp: $60–$100/wk · 988 Lifeline: Free</Text>
          </View>

          {therapistError ? (
            <Text style={{ color: Colors.textMid, textAlign: 'center', marginBottom: 12, fontSize: 12 }}>{therapistError}</Text>
          ) : null}

          {therapistLoading ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <ActivityIndicator size="large" color={PURPLE} />
              <Text style={{ color: Colors.textMid, marginTop: 12 }}>Finding therapists for you…</Text>
            </View>
          ) : (
            therapists.map(t => <TherapistCard key={t.id} t={t} />)
          )}

          <View style={{ backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginTop: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 8 }}>🆘 Crisis Resources</Text>
            {[
              { icon: '📞', label: '988 Suicide & Crisis Lifeline', sub: 'Call or text 988 · 24/7 · Free' },
              { icon: '💬', label: 'Crisis Text Line', sub: 'Text HOME to 741741' },
              { icon: '🧘', label: 'SAMHSA Helpline', sub: '1-800-662-4357 · Free referrals' },
            ].map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: Colors.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: PURPLE_BG, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{r.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.textDark }}>{r.label}</Text>
                  <Text style={{ fontSize: 11, color: Colors.textMid }}>{r.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: { paddingTop: 56, paddingBottom: 18, paddingHorizontal: 20 },
  headerIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },

  tabBar: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: PURPLE },
  tabText: { fontSize: 11, fontWeight: '600', color: Colors.textLight },
  tabTextActive: { color: PURPLE },

  // Chat
  chatContent: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 },
  msgRowUser: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: PURPLE_BG, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: 14 },
  bubbleAI: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, ...Shadow.sm },
  bubbleUser: { backgroundColor: PURPLE, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: Colors.textDark, lineHeight: 21 },
  speakBtn: { marginTop: 8, alignSelf: 'flex-start' },
  typingDots: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.textLight },
  crisisBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 6, backgroundColor: '#fff8f8', borderTopWidth: 1, borderTopColor: '#ffd5d5' },
  crisisText: { fontSize: 11, color: Colors.textMid },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  chatInput: { flex: 1, backgroundColor: Colors.cream, borderRadius: Radius.md, padding: 12, fontSize: 14, color: Colors.textDark, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },

  // Voice
  voiceContent: { padding: 20, paddingBottom: 20, minHeight: 400 },
  voiceTitle: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 },
  voiceSub: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  orbOuter: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  orbInner: { width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  orbLabel: { marginTop: 14, fontSize: 14, fontWeight: '600' },
  promptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 16 },
  promptChip: { backgroundColor: 'rgba(153,69,255,0.15)', borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: PURPLE + '55' },
  promptChipText: { fontSize: 12, color: PURPLE, fontWeight: '500' },
  voiceMsg: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.lg, padding: 14, marginBottom: 10 },
  voiceMsgUser: { backgroundColor: PURPLE + '44' },
  voiceMsgLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase' },
  voiceMsgText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },

  // Therapists
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, fontSize: 14, color: Colors.textDark, borderWidth: 1, borderColor: Colors.border },
  searchBtn: { backgroundColor: PURPLE, borderRadius: Radius.md, paddingHorizontal: 16, justifyContent: 'center' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  filterChipText: { fontSize: 12, fontWeight: '600', color: Colors.textMid },
  resourceBanner: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, marginBottom: 16, borderLeftWidth: 4, ...Shadow.sm },
  therapistCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, ...Shadow.sm, marginBottom: 14 },
  therapistHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
  therapistAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: PURPLE_BG, alignItems: 'center', justifyContent: 'center' },
  therapistName: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  therapistTitle: { fontSize: 12, color: Colors.textMid, marginTop: 1 },
  therapistPlatform: { fontSize: 11, color: PURPLE, fontWeight: '600', marginTop: 2 },
  therapistPrice: { fontSize: 18, fontWeight: '800', color: Colors.navy },
  therapistPriceSub: { fontSize: 10, color: Colors.textLight },
  specialtyChip: { backgroundColor: PURPLE_BG, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  specialtyChipText: { fontSize: 11, fontWeight: '600', color: PURPLE },
  therapistBio: { fontSize: 12, color: Colors.textMid, lineHeight: 17, marginBottom: 10 },
  therapistFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  therapistRating: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  therapistMeta: { fontSize: 11, color: Colors.textLight },
  bookBtn: { backgroundColor: PURPLE, borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: 16 },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
