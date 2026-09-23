import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera } from 'react-native-camera-kit';
import { colors } from '../../theme/colors';

/**
 * Live barcode scan -> raw code value. The caller looks that code up
 * against the same item search/barcode field the web app uses — no
 * separate barcode business logic here.
 */
export function BarcodeScannerModal({ visible, onScan, onClose }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <Camera
          style={StyleSheet.absoluteFill}
          scanBarcode
          onReadCode={(event) => onScan(event.nativeEvent.codeStringValue)}
          showFrame
          laserColor={colors.gold}
          frameColor="#fff"
        />
        <View style={styles.overlay}>
          <Text style={styles.hint}>Point the camera at a barcode</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
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
  hint: { color: '#fff', marginBottom: 16, fontSize: 13 },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  closeText: { color: '#fff', fontWeight: '700' },
});
