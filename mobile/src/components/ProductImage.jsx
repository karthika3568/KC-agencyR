import { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { resolveImageUrl } from '../utils/media';
import { colors } from '../theme/colors';

export function ProductImage({ path, size = 56, style }) {
  const [broken, setBroken] = useState(false);
  const url = path ? resolveImageUrl(path) : null;
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size * 0.2 }, style]}>
      {url && !broken ? (
        <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setBroken(true)} />
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.page, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  placeholder: { width: '60%', height: '60%', borderRadius: 6, backgroundColor: colors.borderSoft },
});
