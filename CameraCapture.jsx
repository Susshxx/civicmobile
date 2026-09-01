import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export default function CameraCapture({ visible, onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return undefined;

    let active = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support an in-page camera.');
      return undefined;
    }

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    }).then((stream) => {
      if (!active) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => setError('Camera permission was denied or is unavailable.'));

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [visible]);

  if (Platform.OS !== 'web' || !visible) return null;

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    onCapture({
      uri: canvas.toDataURL('image/jpeg', 0.85),
      name: `incident-camera-${Date.now()}.jpg`,
    });
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>Take evidence photo</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <video ref={videoRef} autoPlay playsInline style={styles.video} />
          <View style={styles.actions}>
            <Pressable style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.captureButton} onPress={capture}>
              <Text style={styles.captureText}>Capture photo</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, zIndex: 20, backgroundColor: 'rgba(4, 22, 48, 0.82)', justifyContent: 'center', padding: 18 },
  panel: { backgroundColor: '#ffffff', padding: 14, borderRadius: 8 },
  title: { color: '#073b82', fontSize: 18, fontWeight: '800', marginBottom: 10 },
  video: { width: '100%', height: 360, objectFit: 'cover', backgroundColor: '#111111' },
  error: { color: '#c51f3e', marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancel: { flex: 1, borderWidth: 1, borderColor: '#073b82', padding: 12, alignItems: 'center' },
  cancelText: { color: '#073b82', fontWeight: '700' },
  captureButton: { flex: 1, backgroundColor: '#ea123b', padding: 12, alignItems: 'center' },
  captureText: { color: '#ffffff', fontWeight: '800' },
});
