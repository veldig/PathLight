/**
 * Web attention camera — getUserMedia + browser FaceDetector API (Chrome/Edge).
 * Portrait crop, face guide ring, real focus classification.
 */
import { Colors, Radius } from '@/constants/theme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type FocusLevel = 'high' | 'medium' | 'low';

interface Props {
  focusLevel: FocusLevel;
  onFocusChange: (level: FocusLevel) => void;
}

const GOLD = '#C08A3A';
const NO_FACE_TIMEOUT = 1500;

export default function CameraWithAttention({ focusLevel, onFocusChange }: Props) {
  const frameRef = useRef<View>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const noFaceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<'loading' | 'granted' | 'denied' | 'running'>('loading');
  const [hasFaceDetector, setHasFaceDetector] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;

      const domNode = frameRef.current as unknown as HTMLElement;
      if (!domNode) return;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.style.cssText = [
        'position:absolute', 'inset:0', 'width:100%', 'height:100%',
        'object-fit:cover',
        'transform:scaleX(-1)',
        'border-radius:inherit',
      ].join(';');

      domNode.appendChild(video);
      videoRef.current = video;
      await video.play().catch(() => {});
      setStatus('running');
    } catch {
      setStatus('denied');
    }
  }, []);

  const startDetection = useCallback(() => {
    const supported = 'FaceDetector' in window;
    setHasFaceDetector(supported);
    if (!supported) return;

    // @ts-ignore
    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });

    detectionInterval.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;

      try {
        const faces = await detector.detect(video);

        if (!faces.length) {
          if (!noFaceTimer.current) {
            noFaceTimer.current = setTimeout(() => onFocusChange('low'), NO_FACE_TIMEOUT);
          }
          return;
        }

        if (noFaceTimer.current) { clearTimeout(noFaceTimer.current); noFaceTimer.current = null; }

        const { boundingBox } = faces[0];
        const vw = video.videoWidth, vh = video.videoHeight;
        const faceCx = boundingBox.x + boundingBox.width / 2;
        const faceCy = boundingBox.y + boundingBox.height / 2;
        const dx = Math.abs(faceCx - vw / 2) / vw;
        const dy = Math.abs(faceCy - vh / 2) / vh;
        const offset = dx + dy;

        onFocusChange(offset < 0.12 ? 'high' : offset < 0.28 ? 'medium' : 'low');
      } catch { /* transient detector errors */ }
    }, 600);
  }, [onFocusChange]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (detectionInterval.current) clearInterval(detectionInterval.current);
      if (noFaceTimer.current) clearTimeout(noFaceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (status === 'running') startDetection();
  }, [status]);

  const color = focusLevel === 'high' ? '#4caf7d' : focusLevel === 'medium' ? '#f5a623' : '#e05252';
  const label = focusLevel === 'high' ? 'High Focus' : focusLevel === 'medium' ? 'Drifting…' : 'Low Focus';
  const emoji = focusLevel === 'high' ? '🟢' : focusLevel === 'medium' ? '🟡' : '🔴';

  return (
    <View style={styles.card}>
      {/* Portrait camera frame */}
      <View ref={frameRef} style={styles.frame as any}>

        {status === 'denied' && (
          <View style={styles.overlay as any}>
            <Text style={styles.overlayIcon}>📷</Text>
            <Text style={styles.overlayTxt}>Camera access denied</Text>
            <Text style={styles.overlaySubTxt}>Allow camera in browser settings and refresh.</Text>
          </View>
        )}
        {status === 'loading' && (
          <View style={styles.overlay as any}>
            <Text style={styles.overlayTxt}>Starting camera…</Text>
          </View>
        )}

        {/* Face guide ring */}
        {(status === 'running' || status === 'granted') && (
          <View style={[styles.faceRing, { borderColor: color }] as any} />
        )}

        {/* HUD corners */}
        <View style={[styles.corner, { top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2 }]} />
        <View style={[styles.corner, { top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2 }]} />
        <View style={[styles.corner, { bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
        <View style={[styles.corner, { bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2 }]} />

        {/* Focus dot */}
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>

      {/* Status bar */}
      <View style={styles.footer}>
        <View style={[styles.badge, { borderColor: color }]}>
          <View style={[styles.badgeDot, { backgroundColor: color }]} />
          <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
        {!hasFaceDetector && status === 'running' && (
          <Text style={styles.noFDNote}>Chrome flag needed for tracking</Text>
        )}
        {hasFaceDetector && (
          <Text style={styles.liveNote}>● Live tracking</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  frame: {
    width: 280,
    height: 360,
    borderRadius: Radius.lg,
    backgroundColor: '#1a2535',
    marginBottom: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceRing: {
    position: 'absolute',
    width: 160,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    opacity: 0.6,
    zIndex: 3,
  } as any,
  overlay: {
    position: 'absolute',
    inset: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 4,
    padding: 20,
  },
  overlayIcon: { fontSize: 32 },
  overlayTxt: { color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  overlaySubTxt: { color: '#9aaabb', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  corner: { position: 'absolute', width: 18, height: 18, borderColor: GOLD },
  dot: { position: 'absolute', bottom: 14, right: 14, width: 10, height: 10, borderRadius: 5 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 280 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  noFDNote: { fontSize: 11, color: Colors.textLight, fontStyle: 'italic' },
  liveNote: { fontSize: 11, color: '#4caf7d', fontWeight: '700' },
});
