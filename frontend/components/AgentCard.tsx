import { Colors, Radius, Shadow } from '@/constants/theme';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  name: string;
  role: string;
  icon: string;
  status: string;
  progress: number;
  progressLabel: string;
  progressRight: string;
  color: string;
  bgColor: string;
  action: string;
  onPress: () => void;
}

export default function AgentCard({
  name, role, icon, status, progress,
  progressLabel, progressRight, color, bgColor, action, onPress,
}: Props) {
  return (
    <TouchableOpacity style={[styles.card, { borderTopColor: color }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.role}>{role}</Text>
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.statusText, { color }]}>{status}</Text>
      </View>
      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>{progressLabel}</Text>
          <Text style={styles.progressLabel}>{progressRight}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: color }]} />
        </View>
      </View>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: bgColor }]} onPress={onPress}>
        <Text style={[styles.actionText, { color }]}>{action} →</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    width: '48%',
    borderTopWidth: 3,
    ...Shadow.sm,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  role: { fontSize: 11.5, color: Colors.textMid, marginBottom: 10, lineHeight: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  progressSection: { marginTop: 10 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 10, color: Colors.textLight },
  progressBar: { height: 5, backgroundColor: '#f0f0f0', borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 10 },
  actionBtn: { marginTop: 12, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  actionText: { fontSize: 11.5, fontWeight: '700' },
});
