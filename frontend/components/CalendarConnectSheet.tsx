import { Colors, Radius, Shadow } from '@/constants/theme';
import {
  connectAppleCalendar,
  exchangeGoogleCode,
  syncToAppleCalendar,
  syncToGoogleCalendar,
  useGoogleCalendarAuth,
  PathLightEvent,
} from '@/lib/calendarSync';
import { useCalendarStore } from '@/store/calendarStore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  events: PathLightEvent[];
}

export default function CalendarConnectSheet({ visible, onClose, events }: Props) {
  const { connectedProvider, setConnected, disconnect, markSynced } = useCalendarStore();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { request, response, promptAsync } = useGoogleCalendarAuth();

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type !== 'success') return;
    const { code } = response.params;
    const verifier = request?.codeVerifier;
    if (!code || !verifier) return;

    (async () => {
      try {
        const token = await exchangeGoogleCode(code, verifier);
        if (!token) throw new Error('No access token returned');
        await syncToGoogleCalendar(token, events);
        setConnected('google', token);
        markSynced();
        onClose();
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(null);
      }
    })();
  }, [response]);

  async function handleApple() {
    setLoading('apple');
    setError(null);
    try {
      const granted = await connectAppleCalendar();
      if (!granted) throw new Error('Calendar permission denied');
      await syncToAppleCalendar(events);
      setConnected('apple');
      markSynced();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    setLoading('google');
    setError(null);
    await promptAsync();
    // response handled in useEffect above
  }

  function handleDisconnect() {
    disconnect();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.title}>
          {connectedProvider ? 'Calendar Connected' : 'Connect Your Calendar'}
        </Text>
        <Text style={styles.sub}>
          {connectedProvider
            ? `Your PathLight events are syncing to ${connectedProvider === 'google' ? 'Google' : 'Apple'} Calendar.`
            : 'Sync your classes, deadlines & appointments directly to your calendar.'}
        </Text>

        {!connectedProvider ? (
          <View style={styles.options}>
            {/* Google Calendar */}
            <TouchableOpacity
              style={[styles.optionBtn, loading === 'google' && styles.optionBtnLoading]}
              onPress={handleGoogle}
              disabled={!!loading || !request}
            >
              <View style={[styles.providerIcon, { backgroundColor: '#fff3f0' }]}>
                <Text style={{ fontSize: 22 }}>🔴</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Google Calendar</Text>
                <Text style={styles.optionSub}>Sync to your Google account on any device</Text>
              </View>
              {loading === 'google' ? (
                <ActivityIndicator color={Colors.navy} />
              ) : (
                <Text style={styles.arrow}>›</Text>
              )}
            </TouchableOpacity>

            {/* Apple Calendar — only shown on iOS, or Android as device calendar */}
            <TouchableOpacity
              style={[styles.optionBtn, loading === 'apple' && styles.optionBtnLoading]}
              onPress={handleApple}
              disabled={!!loading}
            >
              <View style={[styles.providerIcon, { backgroundColor: '#f0f4ff' }]}>
                <Text style={{ fontSize: 22 }}>{Platform.OS === 'android' ? '📅' : '🍎'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>
                  {Platform.OS === 'android' ? 'Device Calendar' : 'Apple Calendar'}
                </Text>
                <Text style={styles.optionSub}>
                  {Platform.OS === 'android'
                    ? "Sync to your phone's default calendar"
                    : 'Sync to your iPhone or iCloud calendar'}
                </Text>
              </View>
              {loading === 'apple' ? (
                <ActivityIndicator color={Colors.navy} />
              ) : (
                <Text style={styles.arrow}>›</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.connectedBox}>
            <Text style={styles.connectedIcon}>
              {connectedProvider === 'google' ? '🔴' : '🍎'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.connectedName}>
                {connectedProvider === 'google' ? 'Google Calendar' : 'Apple Calendar'}
              </Text>
              <Text style={styles.connectedSub}>Events syncing ✓</Text>
            </View>
            <TouchableOpacity onPress={handleDisconnect}>
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    ...Shadow.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.navy, marginBottom: 6 },
  sub: { fontSize: 13.5, color: Colors.textMid, lineHeight: 20, marginBottom: 22 },
  options: { gap: 12, marginBottom: 16 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  optionBtnLoading: { opacity: 0.6 },
  providerIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  optionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  optionSub: { fontSize: 12, color: Colors.textMid },
  arrow: { fontSize: 20, color: Colors.textLight },
  connectedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: Radius.lg,
    backgroundColor: Colors.sageLight, marginBottom: 16,
  },
  connectedIcon: { fontSize: 28 },
  connectedName: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  connectedSub: { fontSize: 12, color: '#3a7a50', marginTop: 2 },
  disconnectText: { fontSize: 12, color: Colors.terracotta, fontWeight: '600' },
  errorText: {
    color: Colors.terracotta, fontSize: 12.5,
    textAlign: 'center', marginBottom: 12, lineHeight: 18,
  },
  cancelBtn: {
    marginTop: 8, padding: 14, borderRadius: Radius.md,
    backgroundColor: Colors.cream, alignItems: 'center',
  },
  cancelText: { color: Colors.textMid, fontWeight: '600', fontSize: 14 },
});
