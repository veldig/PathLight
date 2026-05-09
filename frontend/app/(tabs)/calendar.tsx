import CalendarConnectSheet from '@/components/CalendarConnectSheet';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { api } from '@/lib/api';
import { syncToAppleCalendar, syncToGoogleCalendar, PathLightEvent } from '@/lib/calendarSync';
import { useCalendarStore } from '@/store/calendarStore';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const AGENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  edupath:     { bg: Colors.sageLight,  text: '#3a7a50',  dot: Colors.sage },
  fundfinder:  { bg: Colors.terraLight, text: '#a04030',  dot: Colors.terracotta },
  careerboost: { bg: '#e8eef7',         text: Colors.navy, dot: Colors.navy },
  wellness:    { bg: Colors.lavender,   text: '#5a4a90',  dot: Colors.lavenderMid },
};

export default function CalendarScreen() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { connectedProvider, googleAccessToken, lastSyncedAt, markSynced } = useCalendarStore();

  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: api.getEvents,
  });

  const events: PathLightEvent[] = (data as any)?.events ?? [];

  // ── Calendar math ──────────────────────────────────────────────────────────
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDay(1);
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedDay(1);
  }

  function eventsOnDay(day: number): PathLightEvent[] {
    return events.filter((e) => {
      const d = new Date(e.datetime);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  const selectedEvents = eventsOnDay(selectedDay);

  // ── Sync handler ───────────────────────────────────────────────────────────
  async function handleSync() {
    if (!connectedProvider) { setSheetOpen(true); return; }
    setSyncing(true);
    try {
      if (connectedProvider === 'apple') {
        await syncToAppleCalendar(events);
      } else if (connectedProvider === 'google' && googleAccessToken) {
        await syncToGoogleCalendar(googleAccessToken, events);
      }
      markSynced();
    } finally {
      setSyncing(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Calendar</Text>
          <Text style={styles.pageSub}>All your PathLight events in one place</Text>
        </View>
        <TouchableOpacity
          style={[styles.connectBtn, connectedProvider && styles.connectBtnActive]}
          onPress={() => setSheetOpen(true)}
        >
          <Text style={styles.connectBtnIcon}>
            {connectedProvider === 'google' ? '🔴' : connectedProvider === 'apple' ? '🍎' : '📅'}
          </Text>
          <Text style={[styles.connectBtnText, connectedProvider && styles.connectBtnTextActive]}>
            {connectedProvider ? 'Connected' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sync banner */}
      {connectedProvider && (
        <TouchableOpacity style={styles.syncBanner} onPress={handleSync} disabled={syncing}>
          {syncing ? (
            <ActivityIndicator size="small" color={Colors.sage} />
          ) : (
            <Text style={styles.syncIcon}>🔄</Text>
          )}
          <Text style={styles.syncText}>
            {syncing
              ? 'Syncing events…'
              : lastSyncedAt
              ? `Last synced ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Tap to sync PathLight events to your calendar'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navArrow} onPress={prevMonth}>
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity style={styles.navArrow} onPress={nextMonth}>
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar grid */}
      <View style={styles.calCard}>
        {/* Day-of-week headers */}
        <View style={styles.dayHeaders}>
          {DAYS.map((d) => (
            <Text key={d} style={styles.dayHeader}>{d}</Text>
          ))}
        </View>

        {/* Day cells */}
        <View style={styles.grid}>
          {/* Leading empty cells */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.cell} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = day === selectedDay;
            const dayEvents = eventsOnDay(day);
            const hasEvents = dayEvents.length > 0;

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.cell,
                  isSelected && styles.cellSelected,
                  isToday && !isSelected && styles.cellToday,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[
                  styles.dayNum,
                  isSelected && styles.dayNumSelected,
                  isToday && !isSelected && styles.dayNumToday,
                ]}>
                  {day}
                </Text>
                {hasEvents && (
                  <View style={styles.dotRow}>
                    {dayEvents.slice(0, 3).map((e, idx) => (
                      <View
                        key={idx}
                        style={[styles.eventDot, { backgroundColor: AGENT_COLORS[e.agent]?.dot ?? Colors.textLight }]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Agent legend */}
      <View style={styles.legend}>
        {Object.entries(AGENT_COLORS).map(([agent, c]) => (
          <View key={agent} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c.dot }]} />
            <Text style={styles.legendText}>{agentLabel(agent)}</Text>
          </View>
        ))}
      </View>

      {/* Selected day events */}
      <View style={styles.eventsSection}>
        <Text style={styles.eventsSectionTitle}>
          {selectedDay} {MONTHS[month]} · {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
        </Text>

        {isLoading ? (
          <ActivityIndicator color={Colors.navy} style={{ marginTop: 20 }} />
        ) : selectedEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌿</Text>
            <Text style={styles.emptyText}>No events on this day</Text>
          </View>
        ) : (
          selectedEvents.map((e) => {
            const colors = AGENT_COLORS[e.agent] ?? AGENT_COLORS.edupath;
            const time = new Date(e.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <View key={e.id} style={[styles.eventRow, { borderLeftColor: colors.dot }]}>
                <View style={[styles.eventTypeBadge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.eventTypeText, { color: colors.text }]}>{agentLabel(e.agent)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  <Text style={styles.eventTime}>{time} · {e.type}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <CalendarConnectSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        events={events}
      />
    </ScrollView>
  );
}

function agentLabel(agent: string): string {
  return { edupath: 'EduPath', fundfinder: 'FundFinder', careerboost: 'CareerBoost', wellness: 'Wellness' }[agent] ?? agent;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: Colors.navy },
  pageSub: { fontSize: 13, color: Colors.textMid, marginTop: 2 },

  connectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  connectBtnActive: { borderColor: Colors.sage, backgroundColor: Colors.sageLight },
  connectBtnIcon: { fontSize: 16 },
  connectBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textMid },
  connectBtnTextActive: { color: '#3a7a50' },

  syncBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.sageLight, borderRadius: Radius.md,
    padding: 12, marginBottom: 14,
  },
  syncIcon: { fontSize: 16 },
  syncText: { fontSize: 12.5, color: '#3a7a50', fontWeight: '500', flex: 1 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navArrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  navArrowText: { fontSize: 22, color: Colors.navy, lineHeight: 28 },
  monthLabel: { fontSize: 17, fontWeight: '700', color: Colors.navy },

  calCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, ...Shadow.sm, marginBottom: 14 },
  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: Colors.textLight, letterSpacing: 0.05 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', minHeight: 52, alignItems: 'center', paddingVertical: 4, borderRadius: 8 },
  cellSelected: { backgroundColor: Colors.navy },
  cellToday: { backgroundColor: Colors.sageLight },
  dayNum: { fontSize: 13, fontWeight: '500', color: Colors.textDark, marginBottom: 3 },
  dayNumSelected: { color: Colors.white, fontWeight: '700' },
  dayNumToday: { color: Colors.navy, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, justifyContent: 'center' },
  eventDot: { width: 5, height: 5, borderRadius: 3 },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11.5, color: Colors.textMid, fontWeight: '500' },

  eventsSection: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, ...Shadow.sm },
  eventsSectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.navy, marginBottom: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 13.5, color: Colors.textLight },

  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderLeftWidth: 3, paddingLeft: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    marginBottom: 4,
  },
  eventTypeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  eventTypeText: { fontSize: 10, fontWeight: '700' },
  eventTitle: { fontSize: 13.5, fontWeight: '600', color: Colors.textDark },
  eventTime: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
});
