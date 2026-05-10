import { Colors, Radius, Shadow } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Colors ───────────────────────────────────────────────────────────────────
const ACCENT = '#9945FF';
const ACCENT_BG = '#f3eeff';
const GREEN = '#14F195';
const DARK_BG = '#1a0533';
const CONFIRMED_BG = '#0d2b1a';

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const PATHLIGHT_TREASURY = 'PLght7xK9mN3qRpF8vCwT2bZdLkMnYs4jEaHuXi6WoA';
const SOL_PRICE = 145;
const TX_FEE = 0.000005;

const QUALIFICATION_CRITERIA = [
  { icon: '👩', text: 'Single mother or primary caregiver' },
  { icon: '🎓', text: 'Enrolled or accepted at an accredited college or university' },
  { icon: '💼', text: 'Working 20 hours or less per week due to caregiving responsibilities' },
  { icon: '💰', text: 'Household income under $40,000 per year' },
  { icon: '👶', text: 'Has at least one child under 12 years old' },
  { icon: '✍️', text: 'Willing to submit a 200-word personal statement' },
  { icon: '📍', text: 'U.S. resident or citizen' },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Community donates', desc: 'Donors contribute SOL to the treasury wallet on Solana' },
  { step: '2', title: 'You apply', desc: 'Submit your application and personal statement through PathLight' },
  { step: '3', title: 'Panel reviews', desc: 'A volunteer panel verifies eligibility each quarter' },
  { step: '4', title: 'Award distributed', desc: 'Funds sent on-chain directly to recipients — fully transparent' },
];

const DONATION_AMOUNTS = [0.1, 0.5, 1, 2, 5];

// ─── Types ────────────────────────────────────────────────────────────────────
type WalletPhase = 'idle' | 'connecting' | 'confirming' | 'confirmed' | 'success';
type DateFilter = 'today' | 'week' | 'all';
type ActiveTab = 'donate' | 'track' | 'report';

interface DonationRecord {
  id: string;
  wallet: string;
  amount: number;
  usd: number;
  txSig: string;
  timestamp: Date;
  status: 'confirmed';
  blockNum: number;
}

interface DistributionRecord {
  id: string;
  recipient: string;
  amount: number;
  purpose: string;
  date: Date;
  txSig: string;
  blockNum: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rnd = (n: number) => Math.floor(Math.random() * n);
const genTxSig = () => Array.from({ length: 87 }, () => BASE58[rnd(BASE58.length)]).join('');
const genWallet = () => Array.from({ length: 44 }, () => BASE58[rnd(BASE58.length)]).join('');
const trunc = (s: string, n = 8) => `${s.slice(0, n)}...${s.slice(-n)}`;
const solToUsd = (sol: number) => `$${(sol * SOL_PRICE).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

function countUp(from: number, to: number, cb: (v: number) => void) {
  const steps = 24;
  const inc = (to - from) / steps;
  let cur = from;
  let i = 0;
  const iv = setInterval(() => {
    i++;
    cur += inc;
    cb(parseFloat(cur.toFixed(1)));
    if (i >= steps) { clearInterval(iv); cb(to); }
  }, 40);
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_DONATIONS: DonationRecord[] = [
  { id: '1', wallet: genWallet(), amount: 2.0,  usd: 290, txSig: genTxSig(), timestamp: new Date(Date.now() - 4 * 60000),  status: 'confirmed', blockNum: 287_654_412 },
  { id: '2', wallet: genWallet(), amount: 1.0,  usd: 145, txSig: genTxSig(), timestamp: new Date(Date.now() - 18 * 60000), status: 'confirmed', blockNum: 287_651_893 },
  { id: '3', wallet: genWallet(), amount: 0.5,  usd:  72, txSig: genTxSig(), timestamp: new Date(Date.now() - 2 * 3600000),  status: 'confirmed', blockNum: 287_621_007 },
  { id: '4', wallet: genWallet(), amount: 5.0,  usd: 725, txSig: genTxSig(), timestamp: new Date(Date.now() - 8 * 3600000),  status: 'confirmed', blockNum: 287_548_231 },
  { id: '5', wallet: genWallet(), amount: 0.1,  usd:  14, txSig: genTxSig(), timestamp: new Date(Date.now() - 2 * 86400000), status: 'confirmed', blockNum: 287_189_044 },
  { id: '6', wallet: genWallet(), amount: 1.5,  usd: 217, txSig: genTxSig(), timestamp: new Date(Date.now() - 5 * 86400000), status: 'confirmed', blockNum: 286_741_982 },
];

const SEED_DISTRIBUTIONS: DistributionRecord[] = [
  { id: '1', recipient: 'Maria T.', amount: 250, purpose: 'Spring 2026 Tuition Assistance', date: new Date('2026-04-15'), txSig: genTxSig(), blockNum: 285_210_771 },
  { id: '2', recipient: 'Jasmine R.', amount: 200, purpose: 'Q1 2026 Scholarship Award',    date: new Date('2026-01-10'), txSig: genTxSig(), blockNum: 271_882_304 },
  { id: '3', recipient: 'Aaliyah W.', amount: 175, purpose: 'Emergency Childcare Fund',     date: new Date('2025-11-03'), txSig: genTxSig(), blockNum: 258_441_129 },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ScholarshipScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Prize pool
  const INITIAL_POOL = 847.3;
  const [prizePool, setPrizePool] = useState(INITIAL_POOL);
  const [displayPool, setDisplayPool] = useState(INITIAL_POOL);

  // Network stats
  const [tps, setTps] = useState(2987);

  // Donation flow
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [walletPhase, setWalletPhase] = useState<WalletPhase>('idle');
  const [currentTxSig, setCurrentTxSig] = useState('');
  const [currentBlockNum, setCurrentBlockNum] = useState(0);

  // Records
  const [donationsIn, setDonationsIn] = useState<DonationRecord[]>(SEED_DONATIONS);
  const [distributions] = useState<DistributionRecord[]>(SEED_DISTRIBUTIONS);

  // UI
  const [activeTab, setActiveTab] = useState<ActiveTab>('donate');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [otherPayVisible, setOtherPayVisible] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Simulated user wallet (stable across renders)
  const userWallet = useRef(genWallet()).current;
  const userBalance = useRef((Math.random() * 9 + 1).toFixed(2)).current;

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setTps(prev => Math.max(2600, Math.min(3400, prev + rnd(201) - 100)));
    }, 1400);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const connectAndDonate = async () => {
    if (!selectedAmount) return;
    const sig = genTxSig();
    const block = 287_654_000 + rnd(500);
    setCurrentTxSig(sig);
    setCurrentBlockNum(block);
    setWalletPhase('connecting');

    await delay(1400);
    setWalletPhase('confirming');

    await delay(1800);
    setWalletPhase('confirmed');

    await delay(1200);
    setWalletPhase('success');

    const newPool = parseFloat((prizePool + selectedAmount).toFixed(1));
    setPrizePool(newPool);
    countUp(displayPool, newPool, setDisplayPool);

    const newDonation: DonationRecord = {
      id: Date.now().toString(),
      wallet: userWallet,
      amount: selectedAmount,
      usd: selectedAmount * SOL_PRICE,
      txSig: sig,
      timestamp: new Date(),
      status: 'confirmed',
      blockNum: block,
    };
    setDonationsIn(prev => [newDonation, ...prev]);
  };

  const closeModal = () => {
    setWalletPhase('idle');
    setSelectedAmount(null);
  };

  const applyForScholarship = async () => {
    setApplying(true);
    await delay(2000);
    setApplying(false);
    setApplied(true);
  };

  const exportReport = () => setToast('✓ Report exported as CSV');

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filteredDonations = donationsIn.filter(d => {
    const now = Date.now();
    if (dateFilter === 'today') return now - d.timestamp.getTime() < 86400000;
    if (dateFilter === 'week')  return now - d.timestamp.getTime() < 7 * 86400000;
    return true;
  });

  const totalReceived = donationsIn.reduce((s, d) => s + d.amount, 0);
  const totalDistributed = distributions.reduce((s, d) => s + (d.amount / SOL_PRICE), 0);
  const balance = totalReceived - totalDistributed;
  const uniqueDonors = new Set(donationsIn.map(d => d.wallet)).size;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: DARK_BG }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 10 }}>
          <Text style={{ color: GREEN, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
        </TouchableOpacity>

        {/* Network stats bar */}
        <View style={styles.netBar}>
          <View style={styles.netStat}>
            <View style={styles.netDot} />
            <Text style={styles.netLabel}>TPS</Text>
            <Text style={styles.netVal}>{tps.toLocaleString()}</Text>
          </View>
          <View style={styles.netDivider} />
          <View style={styles.netStat}>
            <Text style={styles.netLabel}>Block</Text>
            <Text style={styles.netVal}>~400ms</Text>
          </View>
          <View style={styles.netDivider} />
          <View style={styles.netStat}>
            <Text style={styles.netLabel}>Fee</Text>
            <Text style={styles.netVal}>◎ {TX_FEE}</Text>
          </View>
          <View style={styles.netDivider} />
          <View style={styles.netStat}>
            <Text style={styles.netLabel}>SOL</Text>
            <Text style={[styles.netVal, { color: GREEN }]}>${SOL_PRICE}</Text>
          </View>
        </View>

        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <View style={[styles.iconWrap, { backgroundColor: ACCENT_BG }]}>
            <Text style={{ fontSize: 28 }}>🎓</Text>
          </View>
          <Text style={styles.headerTitle}>PathLight Scholarship</Text>
          <Text style={styles.headerSub}>Powered by Solana · Community funded · On-chain transparent</Text>
        </View>

        {/* Treasury wallet */}
        <View style={styles.treasuryBar}>
          <Text style={styles.treasuryLabel}>Treasury</Text>
          <Text style={styles.treasuryAddr}>{trunc(PATHLIGHT_TREASURY, 6)}</Text>
          <View style={styles.treasuryDot} />
          <Text style={[styles.treasuryLabel, { color: GREEN }]}>◎ {displayPool.toFixed(1)} SOL</Text>
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        {(['donate', 'track', 'report'] as ActiveTab[]).map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'donate' ? '⚡ Donate' : tab === 'track' ? '📊 Track' : '📋 Report'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* ══════════════ DONATE TAB ══════════════ */}
        {activeTab === 'donate' && (
          <>
            {/* Prize Pool */}
            <View style={[styles.card, { backgroundColor: DARK_BG, alignItems: 'center', paddingVertical: 28 }]}>
              <Text style={styles.poolLabel}>CURRENT PRIZE POOL</Text>
              <Text style={styles.poolAmount}>◎ {displayPool.toFixed(1)}</Text>
              <Text style={styles.poolUsd}>≈ {solToUsd(displayPool)} USD</Text>
              <View style={styles.poolStats}>
                <View style={styles.poolStat}>
                  <Text style={styles.poolStatNum}>{donationsIn.length}</Text>
                  <Text style={styles.poolStatLbl}>Donors</Text>
                </View>
                <View style={styles.poolDivider} />
                <View style={styles.poolStat}>
                  <Text style={styles.poolStatNum}>{distributions.length}</Text>
                  <Text style={styles.poolStatLbl}>Recipients</Text>
                </View>
                <View style={styles.poolDivider} />
                <View style={styles.poolStat}>
                  <Text style={styles.poolStatNum}>Q3</Text>
                  <Text style={styles.poolStatLbl}>Next Award</Text>
                </View>
              </View>
            </View>

            {/* Simulated connected wallet */}
            <View style={[styles.card, { backgroundColor: '#0d0a1a', borderWidth: 1, borderColor: ACCENT + '44' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>👻</Text>
                  <View>
                    <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '600' }}>PHANTOM WALLET</Text>
                    <Text style={{ fontSize: 12, color: '#fff', fontFamily: 'monospace' }}>{trunc(userWallet, 6)}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>Balance</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: GREEN }}>◎ {userBalance}</Text>
                </View>
              </View>
            </View>

            {/* About */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>💝 About This Scholarship</Text>
              <Text style={{ fontSize: 13, color: Colors.textMid, lineHeight: 20 }}>
                The PathLight Scholarship is a community-funded award for mothers and primary caregivers returning to school. Every donation is recorded on the Solana blockchain — 100% transparent, 0% administrative fees.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <View style={[styles.badge, { backgroundColor: ACCENT_BG }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: ACCENT }}>🔒 On-chain verified</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: '#e8f5e9' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#27ae60' }}>⚡ ~400ms finality</Text>
                </View>
              </View>
            </View>

            {/* How It Works */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⚙️ How It Works</Text>
              {HOW_IT_WORKS.map((item, i) => (
                <View key={i} style={[styles.howRow, i === HOW_IT_WORKS.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.stepCircle, { backgroundColor: ACCENT_BG }]}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: ACCENT }}>{item.step}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.textDark }}>{item.title}</Text>
                    <Text style={{ fontSize: 12, color: Colors.textMid, marginTop: 2 }}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Criteria + Apply */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>✅ Qualification Criteria</Text>
              {QUALIFICATION_CRITERIA.map((c, i) => (
                <View key={i} style={[styles.criteriaRow, i === QUALIFICATION_CRITERIA.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                  <Text style={{ flex: 1, fontSize: 13, color: Colors.textMid, lineHeight: 18 }}>{c.text}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: applied ? '#27ae60' : ACCENT, marginTop: 16 }]}
                onPress={applyForScholarship}
                disabled={applying || applied}
              >
                {applying ? <ActivityIndicator color="#fff" /> : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' }}>
                    {applied ? '✓ Application Submitted!' : 'Apply for Scholarship →'}
                  </Text>
                )}
              </TouchableOpacity>
              {applied && (
                <Text style={{ fontSize: 12, color: Colors.textMid, textAlign: 'center', marginTop: 8 }}>
                  {user?.email ? `We'll contact ${user.email} within 5–7 business days.` : "We'll review and contact you within 5–7 business days."}
                </Text>
              )}
            </View>

            {/* Donate with SOL */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⚡ Donate with Solana</Text>
              <Text style={{ fontSize: 13, color: Colors.textMid, marginBottom: 16 }}>
                Donations settle in ~400ms with a fee of only ◎ {TX_FEE} — faster and cheaper than any traditional payment.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {DONATION_AMOUNTS.map(amt => (
                  <TouchableOpacity
                    key={amt}
                    style={[styles.amountBtn, selectedAmount === amt && { backgroundColor: ACCENT, borderColor: ACCENT }]}
                    onPress={() => setSelectedAmount(amt)}
                  >
                    <Text style={[styles.amountSOL, selectedAmount === amt && { color: '#fff' }]}>◎ {amt}</Text>
                    <Text style={[styles.amountUSD, selectedAmount === amt && { color: 'rgba(255,255,255,0.7)' }]}>{solToUsd(amt)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: selectedAmount ? ACCENT : Colors.border, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]}
                onPress={connectAndDonate}
                disabled={!selectedAmount}
              >
                <Text style={{ fontSize: 18 }}>👻</Text>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  {selectedAmount ? `Donate ◎ ${selectedAmount} via Phantom` : 'Select an amount'}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: Colors.textLight, textAlign: 'center', marginTop: 8 }}>
                Demo mode · No real SOL transferred · Fee: ◎ {TX_FEE}
              </Text>
            </View>

            {/* Other payment */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>💳 Other Ways to Donate</Text>
              {['💳  Credit or Debit Card', '🅿️  PayPal', '🏦  Bank Transfer (ACH)'].map((m, i) => (
                <TouchableOpacity key={i} style={[styles.otherPayRow, i === 2 && { borderBottomWidth: 0 }]} onPress={() => setOtherPayVisible(true)}>
                  <Text style={{ fontSize: 13, color: Colors.textDark, fontWeight: '500' }}>{m}</Text>
                  <Text style={{ fontSize: 16, color: ACCENT }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ══════════════ TRACK TAB ══════════════ */}
        {activeTab === 'track' && (
          <>
            {/* Date filter */}
            <View style={[styles.card, { padding: 12 }]}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['today', 'week', 'all'] as DateFilter[]).map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterBtn, dateFilter === f && { backgroundColor: ACCENT, borderColor: ACCENT }]}
                    onPress={() => setDateFilter(f)}
                  >
                    <Text style={[styles.filterText, dateFilter === f && { color: '#fff' }]}>
                      {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'All Time'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Donations IN */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.cardTitle}>⬇️ Donations Received</Text>
                <View style={[styles.badge, { backgroundColor: '#e8f5e9' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#27ae60' }}>{filteredDonations.length} txns</Text>
                </View>
              </View>
              {filteredDonations.length === 0 ? (
                <Text style={{ fontSize: 13, color: Colors.textLight, textAlign: 'center', paddingVertical: 12 }}>No donations in this period</Text>
              ) : filteredDonations.map((d, i) => (
                <View key={d.id} style={[styles.txRow, i === filteredDonations.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.txIcon, { backgroundColor: ACCENT_BG }]}>
                    <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '700' }}>◎</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textDark }}>◎ {d.amount} <Text style={{ color: Colors.textLight }}>≈ {solToUsd(d.amount)}</Text></Text>
                      <View style={styles.confirmedBadge}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: GREEN }}>✓ CONFIRMED</Text>
                      </View>
                    </View>
                    <Text style={styles.txMeta}>From: {trunc(d.wallet, 6)}</Text>
                    <Text style={styles.txMeta}>Sig: {trunc(d.txSig, 8)}</Text>
                    <Text style={styles.txMeta}>Block #{d.blockNum.toLocaleString()} · {timeAgo(d.timestamp)}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Distributions OUT */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.cardTitle}>⬆️ Distributions Sent</Text>
                <View style={[styles.badge, { backgroundColor: '#fdecea' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#c0392b' }}>{distributions.length} awards</Text>
                </View>
              </View>
              {distributions.map((d, i) => (
                <View key={d.id} style={[styles.txRow, i === distributions.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.txIcon, { backgroundColor: '#fdecea' }]}>
                    <Text style={{ fontSize: 14 }}>🎓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textDark }}>{d.recipient}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.terracotta }}>${d.amount}</Text>
                    </View>
                    <Text style={styles.txMeta}>{d.purpose}</Text>
                    <Text style={styles.txMeta}>Sig: {trunc(d.txSig, 8)}</Text>
                    <Text style={styles.txMeta}>Block #{d.blockNum.toLocaleString()} · {d.date.toLocaleDateString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ══════════════ REPORT TAB ══════════════ */}
        {activeTab === 'report' && (
          <>
            <View style={[styles.card, { backgroundColor: DARK_BG }]}>
              <Text style={[styles.cardTitle, { color: '#fff', marginBottom: 16 }]}>📋 Scholarship Fund Report</Text>
              {[
                { label: 'Total Received',    value: `◎ ${totalReceived.toFixed(2)}`,         sub: solToUsd(totalReceived),          color: GREEN },
                { label: 'Total Distributed', value: `$${distributions.reduce((s,d)=>s+d.amount,0).toLocaleString()}`, sub: `${distributions.length} recipients`, color: '#e74c3c' },
                { label: 'Current Balance',   value: `◎ ${balance.toFixed(2)}`,               sub: solToUsd(balance),                color: ACCENT },
                { label: 'Total Donors',      value: `${uniqueDonors}`,                        sub: `${donationsIn.length} transactions`, color: '#fff' },
              ].map((row, i) => (
                <View key={i} style={[styles.reportRow, i === 3 && { borderBottomWidth: 0 }]}>
                  <Text style={{ fontSize: 13, color: '#9ca3af' }}>{row.label}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: row.color }}>{row.value}</Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>{row.sub}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🔗 Treasury Wallet</Text>
              <View style={{ backgroundColor: Colors.cream, borderRadius: Radius.md, padding: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 10, color: Colors.textLight, fontWeight: '700', marginBottom: 4 }}>PATHLIGHT TREASURY ADDRESS</Text>
                <Text style={{ fontSize: 12, color: Colors.textDark, fontFamily: 'monospace' }}>{PATHLIGHT_TREASURY}</Text>
              </View>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: ACCENT_BG, borderWidth: 1, borderColor: ACCENT }]}
                onPress={() => Linking.openURL(`https://solscan.io/account/${PATHLIGHT_TREASURY}`)}
              >
                <Text style={{ color: ACCENT, fontWeight: '700', textAlign: 'center', fontSize: 13 }}>View on Solscan →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📤 Export</Text>
              <Text style={{ fontSize: 13, color: Colors.textMid, marginBottom: 14 }}>
                Download a full audit trail of all donations and distributions for compliance reporting.
              </Text>
              <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.navy }]} onPress={exportReport}>
                <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Export Full Report (CSV)</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Toast ── */}
      {toast && (
        <View style={styles.toast}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{toast}</Text>
        </View>
      )}

      {/* ── Wallet Modal ── */}
      <Modal visible={walletPhase !== 'idle'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>

            {walletPhase === 'connecting' && (
              <View style={styles.modalInner}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>👻</Text>
                <Text style={styles.modalTitle}>Connecting Phantom</Text>
                <Text style={styles.modalSub}>{trunc(userWallet, 8)}</Text>
                <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 24 }} />
                <Text style={styles.modalStatus}>Awaiting wallet approval…</Text>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setWalletPhase('idle')}>
                  <Text style={{ color: Colors.textMid, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {walletPhase === 'confirming' && (
              <View style={styles.modalInner}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>⚡</Text>
                <Text style={styles.modalTitle}>Broadcasting to Solana</Text>
                <View style={[styles.txPreview, { backgroundColor: ACCENT_BG }]}>
                  <Text style={{ fontSize: 12, color: Colors.textMid }}>Sending to PathLight Treasury</Text>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: ACCENT, marginVertical: 6 }}>◎ {selectedAmount}</Text>
                  <Text style={{ fontSize: 12, color: Colors.textMid }}>≈ {solToUsd(selectedAmount ?? 0)}</Text>
                  <Text style={{ fontSize: 10, color: Colors.textLight, marginTop: 8, fontFamily: 'monospace' }}>
                    {trunc(currentTxSig, 12)}
                  </Text>
                </View>
                <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 20 }} />
                <Text style={styles.modalStatus}>Confirming on block #{currentBlockNum.toLocaleString()}…</Text>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setWalletPhase('idle')}>
                  <Text style={{ color: Colors.textMid, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {walletPhase === 'confirmed' && (
              <View style={styles.modalInner}>
                <View style={[styles.confirmedIcon]}>
                  <Text style={{ fontSize: 32 }}>✓</Text>
                </View>
                <Text style={[styles.modalTitle, { color: GREEN }]}>Confirmed in ~0.4s</Text>
                <View style={[styles.txPreview, { backgroundColor: CONFIRMED_BG, borderWidth: 1, borderColor: GREEN + '44' }]}>
                  <Text style={{ fontSize: 11, color: GREEN, fontWeight: '700', marginBottom: 8 }}>TRANSACTION CONFIRMED</Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Signature</Text>
                  <Text style={{ fontSize: 10, color: '#fff', fontFamily: 'monospace', marginBottom: 10 }}>{trunc(currentTxSig, 16)}</Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Block</Text>
                  <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700', marginBottom: 10 }}>#{currentBlockNum.toLocaleString()}</Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Fee paid</Text>
                  <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>◎ {TX_FEE}</Text>
                </View>
                <TouchableOpacity
                  style={{ marginTop: 14 }}
                  onPress={() => Linking.openURL(`https://solscan.io/tx/${currentTxSig}`)}
                >
                  <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '600' }}>View on Solscan →</Text>
                </TouchableOpacity>
                <ActivityIndicator size="small" color={GREEN} style={{ marginTop: 12 }} />
              </View>
            )}

            {walletPhase === 'success' && (
              <View style={styles.modalInner}>
                <Text style={{ fontSize: 64, marginBottom: 12 }}>🎉</Text>
                <Text style={styles.modalTitle}>Donation Complete!</Text>
                <View style={[styles.txPreview, { backgroundColor: '#e8f5e9' }]}>
                  <Text style={{ fontSize: 13, color: '#2e7d32', fontWeight: '700' }}>✓ Settled on Solana mainnet</Text>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: '#27ae60', marginVertical: 8 }}>◎ {selectedAmount}</Text>
                  <Text style={{ fontSize: 11, color: '#2e7d32', fontFamily: 'monospace' }}>{trunc(currentTxSig, 14)}</Text>
                  <Text style={{ fontSize: 11, color: '#2e7d32', marginTop: 6 }}>Thank you for supporting student mothers! 💚</Text>
                </View>
                <TouchableOpacity
                  style={{ marginTop: 12, marginBottom: 4 }}
                  onPress={() => Linking.openURL(`https://solscan.io/tx/${currentTxSig}`)}
                >
                  <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '600' }}>View on Solscan →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: ACCENT, marginTop: 12 }]} onPress={closeModal}>
                  <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

      {/* ── Other Payment Modal ── */}
      <Modal visible={otherPayVisible} animationType="fade" transparent>
        <View style={[styles.modalOverlay, { justifyContent: 'center', paddingHorizontal: 24 }]}>
          <View style={[styles.modalSheet, { borderRadius: 24, minHeight: 0 }]}>
            <View style={{ padding: 28, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🚧</Text>
              <Text style={styles.modalTitle}>Coming Soon</Text>
              <Text style={{ fontSize: 13, color: Colors.textMid, textAlign: 'center', marginTop: 8, marginBottom: 20 }}>
                Card and PayPal donations are coming soon. For now, donate with Solana — instant settlement and near-zero fees.
              </Text>
              <TouchableOpacity style={[styles.btn, { backgroundColor: ACCENT }]} onPress={() => setOtherPayVisible(false)}>
                <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },

  // Network stats bar
  netBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 12, gap: 0 },
  netStat: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10 },
  netDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN, marginRight: 2 },
  netLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  netVal: { fontSize: 11, color: '#fff', fontWeight: '700' },
  netDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.1)' },

  // Treasury bar
  treasuryBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  treasuryLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  treasuryAddr: { fontSize: 10, color: '#fff', fontFamily: 'monospace' },
  treasuryDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#9ca3af' },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: ACCENT },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.textLight },
  tabTextActive: { color: ACCENT },

  // Cards
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },

  // Prize pool
  poolLabel: { fontSize: 11, color: '#9ca3af', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  poolAmount: { fontSize: 52, fontWeight: '800', color: GREEN, marginBottom: 2 },
  poolUsd: { fontSize: 15, color: '#9ca3af', marginBottom: 18 },
  poolStats: { flexDirection: 'row', gap: 24 },
  poolStat: { alignItems: 'center' },
  poolStatNum: { fontSize: 20, fontWeight: '700', color: '#fff' },
  poolStatLbl: { fontSize: 10, color: '#9ca3af' },
  poolDivider: { width: 1, backgroundColor: '#333' },

  // Content rows
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  stepCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  criteriaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },

  // Donation amounts
  amountBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', minWidth: 76 },
  amountSOL: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  amountUSD: { fontSize: 10, color: Colors.textLight },

  // Other pay
  otherPayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },

  // Transactions
  txRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  txIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  txMeta: { fontSize: 10, color: Colors.textLight, marginTop: 1, fontFamily: 'monospace' },
  confirmedBadge: { backgroundColor: CONFIRMED_BG, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: GREEN + '44' },

  // Filter
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  filterText: { fontSize: 12, fontWeight: '600', color: Colors.textMid },

  // Report
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },

  // Buttons
  btn: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: Radius.md },
  cancelBtn: { marginTop: 18, paddingVertical: 10, paddingHorizontal: 24, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, minHeight: 360 },
  modalInner: { padding: 32, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textDark, marginBottom: 4, textAlign: 'center' },
  modalSub: { fontSize: 12, color: Colors.textLight, fontFamily: 'monospace' },
  modalStatus: { fontSize: 13, color: Colors.textMid, marginTop: 14, textAlign: 'center', fontStyle: 'italic' },
  txPreview: { width: '100%', borderRadius: Radius.lg, padding: 18, alignItems: 'center', marginTop: 16 },
  confirmedIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#0d2b1a', borderWidth: 2, borderColor: GREEN, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },

  // Toast
  toast: { position: 'absolute', bottom: 40, left: 24, right: 24, backgroundColor: '#1a2a3a', borderRadius: Radius.md, padding: 14, alignItems: 'center', ...Shadow.lg },
});
