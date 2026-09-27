import { useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera } from 'react-native-camera-kit';
import { runOnJS } from 'react-native-reanimated';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';

/**
 * Live barcode scan -> raw code value.
 * Uses 'worklet' directive to safely transition from UI runtime callback to JS runtime
 * avoiding "Tried to synchronously call a remote function" errors in Reanimated / Worklets.
 */
export function BarcodeScannerModal({ visible, onScan, onClose }) {
  const scannedRef = useRef(false);

  if (!visible) {
    scannedRef.current = false;
    return null;
  }

  const handleReadCode = (event) => {
    'worklet';
    if (scannedRef.current) return;
    const code = event?.nativeEvent?.codeStringValue;
    if (!code) return;

    scannedRef.current = true;
    if (typeof runOnJS === 'function') {
      runOnJS(onScan)(code);
    } else {
      onScan(code);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <Camera
          style={StyleSheet.absoluteFill}
          scanBarcode
          onReadCode={handleReadCode}
          showFrame
          laserColor={colors.gold}
          frameColor="#fff"
        />
        <View style={styles.overlay}>
          <Text style={styles.hint}>Point the camera at a barcode</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Icon name="close" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  hint: { color: '#fff', marginBottom: 16, fontSize: 13, fontWeight: '600' },
  closeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  closeText: { color: '#fff', fontWeight: '700' },
});
