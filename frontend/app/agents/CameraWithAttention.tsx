/**
 * Native attention camera (iOS / Android).
 * Uses expo-camera CameraView with built-in face detection.
 */
import { Colors, Radius } from '@/constants/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type FocusLevel = 'high' | 'medium' | 'low';

interface Props {
  focusLevel: FocusLevel;
  onFocusChange: (level: FocusLevel) => void;
}

const GOLD = '#C08A3A';

function faceToLevel(faces: any[]): FocusLevel {
  if (!faces.length) return 'low';
  const { rollAngle = 0, yawAngle = 0 } = faces[0];
  const drift = Math.abs(rollAngle) + Math.abs(yawAngle);
  return drift < 15 ? 'high' : drift < 35 ? 'medium' : 'low';
}

export default function CameraWithAttention({ focusLevel, onFocusChange }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFaces = ({ faces }: { faces: any[] }) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onFocusChange(faceToLevel(faces)), 400);
  };

  const color = focusLevel === 'high' ? '#4caf7d' : focusLevel === 'medium' ? '#f5a623' : '#e05252';
  const label = focusLevel === 'high' ? 'High Focus' : focusLevel === 'medium' ? 'Drifting…' : 'Low Focus';

  return (
    <View style={styles.card}>
      <View style={styles.frame}>
        {!permission ? (
          <ActivityIndicator color={GOLD} />
        ) : !permission.granted ? (
          <View style={styles.permWrap}>
            <Text style={styles.permText}>Allow camera to track your focus.</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnTxt}>Enable Camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="front"
            onFacesDetected={handleFaces}
            faceDetectorSettings={{
              mode: 'fast', detectLandmarks: 'none',
              runClassifications: 'none', minDetectionInterval: 300, tracking: true,
            }}
          />
        )}
        <View style={[styles.corner, { top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2 }]} />
        <View style={[styles.corner, { top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2 }]} />
        <View style={[styles.corner, { bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
        <View style={[styles.corner, { bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2 }]} />
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      <View style={styles.footer}>
        <View style={[styles.badge, { borderColor: color }]}>
          <View style={[styles.badgeDot, { backgroundColor: color }]} />
          <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, marginBottom: 16 },
  frame: {
    height: 220, borderRadius: Radius.md, backgroundColor: '#1a2535',
    marginBottom: 12, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  corner: { position: 'absolute', width: 18, height: 18, borderColor: GOLD },
  dot: { position: 'absolute', bottom: 14, right: 14, width: 10, height: 10, borderRadius: 5 },
  permWrap: { alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  permText: { color: '#9aaabb', fontSize: 13, textAlign: 'center' },
  permBtn: { backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 10 },
  permBtnTxt: { color: '#1F3A5F', fontWeight: '700', fontSize: 14 },
  footer: { flexDirection: 'row', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 13, fontWeight: '700' },
});
