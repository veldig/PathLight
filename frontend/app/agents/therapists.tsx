import { Colors, Radius, Shadow } from '@/constants/theme';
import { api, Therapist } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const SPECIALTY_CHIPS = [
  'All',
  'Anxiety',
  'Depression',
  'Parenting',
  'Trauma',
  'Postpartum',
  'Co-parenting',
  'Grief',
  'ADHD',
];

const PRICE_FILTERS = [
  { label: 'Any price', value: undefined },
  { label: 'Under $50', value: 49 },
  { label: 'Under $75', value: 74 },
  { label: 'Under $100', value: 99 },
];

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: 11, color: i <= full ? '#f5a623' : Colors.border }}>
          ★
        </Text>
      ))}
      <Text style={{ fontSize: 11, color: Colors.textMid, marginLeft: 3 }}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function TherapistCard({ t, onBook }: { t: Therapist; onBook: (t: Therapist) => void }) {
  const initials = t.name
    .split(' ')
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.therapistName}>{t.name}</Text>
          <Text style={styles.therapistTitle}>{t.title}</Text>
          <StarRating rating={t.rating} />
        </View>
        <View style={styles.priceTag}>
          <Text style={styles.priceAmount}>${t.price_per_session}</Text>
          <Text style={styles.priceLabel}>/session</Text>
        </View>
      </View>

      <View style={styles.chipRow}>
        {t.specialties.slice(0, 3).map((s, i) => (
          <View key={i} style={styles.chip}>
            <Text style={styles.chipText}>{s}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.bio} numberOfLines={3}>{t.bio}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>💻</Text>
          <Text style={styles.metaText}>Telehealth</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>🏢</Text>
          <Text style={styles.metaText}>{t.platform}</Text>
        </View>
        {t.accepts_insurance && (
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>🏥</Text>
            <Text style={styles.metaText}>Insurance OK</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.availRow}>
          <Text style={styles.availDot}>●</Text>
          <Text style={styles.availText}>{t.next_available}</Text>
        </View>
        <TouchableOpacity style={styles.bookBtn} onPress={() => onBook(t)}>
          <Text style={styles.bookBtnText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TherapistListScreen() {
  const router = useRouter();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSpecialty, setActiveSpecialty] = useState('All');
  const [priceFilter, setPriceFilter] = useState<number | undefined>(undefined);
  const [insuranceOnly, setInsuranceOnly] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadTherapists();
  }, [activeSpecialty, priceFilter, insuranceOnly]);

  async function loadTherapists() {
    setLoading(true);
    setError('');
    try {
      const params: { specialty?: string; max_price?: number; insurance_only?: boolean } = {};
      if (activeSpecialty !== 'All') params.specialty = activeSpecialty;
      if (priceFilter) params.max_price = priceFilter;
      if (insuranceOnly) params.insurance_only = true;
      const res = await api.getTherapists(params);
      setTherapists(res.therapists);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  function onSearchChange(text: string) {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) {
      loadTherapists();
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchTherapists(text.trim());
        setTherapists(res.therapists);
      } catch {
        // keep existing list
      }
      setLoading(false);
    }, 500);
  }

  function handleBook(t: Therapist) {
    if (t.booking_url) Linking.openURL(t.booking_url);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Text style={{ fontSize: 22 }}>🧑‍⚕️</Text>
        </View>
        <Text style={styles.headerTitle}>Find a Therapist</Text>
        <Text style={styles.headerSub}>Affordable telehealth therapy for single parents</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      >
        {/* Sticky search + filters */}
        <View style={styles.stickyFilters}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by specialty, concern, or name…"
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={onSearchChange}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); loadTherapists(); }}>
                <Text style={{ color: Colors.textLight, fontSize: 16, paddingRight: 4 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {SPECIALTY_CHIPS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, activeSpecialty === s && styles.filterChipActive]}
                onPress={() => setActiveSpecialty(s)}
              >
                <Text style={[styles.filterChipText, activeSpecialty === s && styles.filterChipTextActive]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.secondRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {PRICE_FILTERS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.filterChip, priceFilter === p.value && styles.filterChipActive]}
                  onPress={() => setPriceFilter(p.value)}
                >
                  <Text style={[styles.filterChipText, priceFilter === p.value && styles.filterChipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.insuranceToggle, insuranceOnly && styles.insuranceToggleActive]}
              onPress={() => setInsuranceOnly(!insuranceOnly)}
            >
              <Text style={[styles.insuranceToggleText, insuranceOnly && styles.insuranceToggleTextActive]}>
                🏥 Insurance
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        <View style={styles.resultsContainer}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={Colors.lavenderMid} />
              <Text style={styles.loadingText}>Finding therapists for you…</Text>
            </View>
          ) : error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>⚠ {error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadTherapists}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : therapists.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🔎</Text>
              <Text style={styles.emptyTitle}>No therapists found</Text>
              <Text style={styles.emptySub}>Try adjusting your filters or search query.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultCount}>{therapists.length} therapists available</Text>
              {therapists.map((t) => (
                <TherapistCard key={t.id} t={t} onBook={handleBook} />
              ))}

              <View style={styles.disclaimer}>
                <Text style={styles.disclaimerText}>
                  Listings are curated from Open Path Collective, BetterHelp, Talkspace, and other platforms. Clicking
                  "Book" opens the therapist's platform directly. Prices shown are per-session estimates — verify
                  current rates on the platform.
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.lavenderMid,
    padding: 24,
    paddingTop: 56,
    alignItems: 'center',
  },
  backBtn: { position: 'absolute', top: 56, left: 16 },
  backText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },

  stickyFilters: { backgroundColor: Colors.background, paddingBottom: 8, paddingTop: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...Shadow.sm,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark },
  chipScroll: { paddingLeft: 12, marginTop: 10 },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: Colors.white,
  },
  filterChipActive: { backgroundColor: Colors.lavenderMid, borderColor: Colors.lavenderMid },
  filterChipText: { fontSize: 13, color: Colors.textMid, fontWeight: '500' },
  filterChipTextActive: { color: Colors.white, fontWeight: '700' },
  secondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    marginTop: 8,
    gap: 8,
  },
  insuranceToggle: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.white,
    marginRight: 16,
  },
  insuranceToggleActive: { backgroundColor: '#e8f5e9', borderColor: '#4caf50' },
  insuranceToggleText: { fontSize: 13, color: Colors.textMid, fontWeight: '500' },
  insuranceToggleTextActive: { color: '#2e7d32', fontWeight: '700' },

  content: { paddingBottom: 48 },
  resultsContainer: { paddingHorizontal: 16, paddingTop: 8 },
  resultCount: { fontSize: 12, color: Colors.textLight, marginBottom: 10, marginTop: 4 },

  loadingWrap: { alignItems: 'center', paddingVertical: 60, gap: 14 },
  loadingText: { color: Colors.textMid, fontSize: 14 },
  errorWrap: { alignItems: 'center', padding: 32, gap: 12 },
  errorText: { color: Colors.terracotta, fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.lavenderMid, borderRadius: Radius.sm, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: Colors.white, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  emptySub: { fontSize: 13, color: Colors.textMid },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 14,
    ...Shadow.sm,
  },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 18, fontWeight: '700', color: Colors.lavenderMid },
  therapistName: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  therapistTitle: { fontSize: 12, color: Colors.textMid, marginBottom: 4 },
  priceTag: { alignItems: 'flex-end' },
  priceAmount: { fontSize: 20, fontWeight: '800', color: Colors.lavenderMid },
  priceLabel: { fontSize: 11, color: Colors.textMid, marginTop: -2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    backgroundColor: Colors.lavender,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, color: Colors.lavenderMid, fontWeight: '600' },
  bio: { fontSize: 13, color: Colors.textMid, lineHeight: 19, marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { fontSize: 13 },
  metaText: { fontSize: 12, color: Colors.textMid },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  availDot: { fontSize: 10, color: '#4caf50' },
  availText: { fontSize: 12, color: Colors.textMid },
  bookBtn: {
    backgroundColor: Colors.lavenderMid,
    borderRadius: Radius.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  bookBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },

  disclaimer: {
    backgroundColor: Colors.lavender,
    borderRadius: Radius.md,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  disclaimerText: { fontSize: 11, color: Colors.textMid, lineHeight: 16 },
});
