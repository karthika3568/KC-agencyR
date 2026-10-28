import { useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera } from 'react-native-camera-kit';
import { runOnJS } from 'react-native-reanimated';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';

/**
 * Retail/distributor barcode formats only — react-native-camera-kit's ML Kit
 * decoder otherwise checks every supported symbology (including QR/Aztec/
 * PDF-417/Data Matrix, none of which this catalog ever uses) on every single
 * camera frame. Restricting the decoder to just the formats real product
 * barcodes actually use is the single biggest, well-documented recognition-
 * speed lever this library exposes — less work per frame, not a UI trick.
 * Both 'itf' (Android) and 'itf-14' (iOS) are listed since the two platforms
 * spell the same format differently.
 */
const ALLOWED_BARCODE_TYPES = ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'code-39', 'itf', 'itf-14'];

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
          allowedBarcodeTypes={ALLOWED_BARCODE_TYPES}
          // 0 = no artificial delay between decode attempts; duplicate-scan
          // protection is already handled in JS via scannedRef below, and
          // handleBarcodeRead (the caller) closes this modal — unmounting
          // the Camera and stopping frame analysis entirely — the instant
          // a match is found, so nothing here needs its own cooldown.
          scanThrottleDelay={0}
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
