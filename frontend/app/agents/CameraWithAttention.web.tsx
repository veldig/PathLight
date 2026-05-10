/**
 * Web attention camera — getUserMedia + face-api.js (TinyFaceDetector via CDN).
 * Works in Chrome, Firefox, Safari — no flags required.
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
const MODEL_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const FACEAPI_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function CameraWithAttention({ focusLevel, onFocusChange }: Props) {
  const frameRef = useRef<View>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const noFaceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectionLoop = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'denied' | 'running'>('loading');
  const [modelReady, setModelReady] = useState(false);

  // ── start webcam ────────────────────────────────────────────────────────────
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
        'object-fit:cover', 'transform:scaleX(-1)', 'border-radius:inherit',
        'z-index:1',
      ].join(';');

      domNode.appendChild(video);
      videoRef.current = video;
      await video.play().catch(() => {});
      setStatus('running');
    } catch {
      setStatus('denied');
    }
  }, []);

  // ── load face-api + model, then run detection loop ───────────────────────
  const startDetection = useCallback(async () => {
    try {
      await loadScript(FACEAPI_CDN);
      const faceapi = (window as any).faceapi;
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_CDN);
      setModelReady(true);

      const opts = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4, inputSize: 224 });

      const detect = async () => {
        if (stoppedRef.current) return;
        const video = videoRef.current;

        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          try {
            const det = await faceapi.detectSingleFace(video, opts);

            if (!det) {
              if (!noFaceTimer.current) {
                noFaceTimer.current = setTimeout(() => onFocusChange('low'), NO_FACE_TIMEOUT);
              }
            } else {
              if (noFaceTimer.current) { clearTimeout(noFaceTimer.current); noFaceTimer.current = null; }
              const { box } = det;
              const vw = video.videoWidth, vh = video.videoHeight;
              const cx = box.x + box.width / 2;
              const cy = box.y + box.height / 2;
              const dx = Math.abs(cx - vw / 2) / vw;
              const dy = Math.abs(cy - vh / 2) / vh;
              const offset = dx + dy;
              onFocusChange(offset < 0.15 ? 'high' : offset < 0.32 ? 'medium' : 'low');
            }
          } catch { /* transient */ }
        }

        detectionLoop.current = setTimeout(detect, 600);
      };

      detect();
    } catch (e) {
      console.error('face-api load failed', e);
    }
  }, [onFocusChange]);

  useEffect(() => {
    stoppedRef.current = false;
    startCamera();
    return () => {
      stoppedRef.current = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (detectionLoop.current) clearTimeout(detectionLoop.current);
      if (noFaceTimer.current) clearTimeout(noFaceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (status === 'running') startDetection();
  }, [status]);

  const color = focusLevel === 'high' ? '#4caf7d' : focusLevel === 'medium' ? '#f5a623' : '#e05252';
  const label = focusLevel === 'high' ? 'High Focus' : focusLevel === 'medium' ? 'Drifting…' : 'Low Focus';

  return (
    <View style={styles.card}>
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
        <View style={[styles.faceRing, { borderColor: color }] as any} />

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
        <Text style={modelReady ? styles.liveNote : styles.loadingNote}>
          {modelReady ? '● Live tracking' : status === 'running' ? 'Loading model…' : ''}
        </Text>
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
    opacity: 0.7,
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
    backgroundColor: '#1a2535',
  },
  overlayIcon: { fontSize: 32 },
  overlayTxt: { color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  overlaySubTxt: { color: '#9aaabb', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  corner: { position: 'absolute', width: 18, height: 18, borderColor: GOLD, zIndex: 3 },
  dot: { position: 'absolute', bottom: 14, right: 14, width: 10, height: 10, borderRadius: 5, zIndex: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 280 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  liveNote: { fontSize: 11, color: '#4caf7d', fontWeight: '700' },
  loadingNote: { fontSize: 11, color: Colors.textLight, fontStyle: 'italic' },
});
