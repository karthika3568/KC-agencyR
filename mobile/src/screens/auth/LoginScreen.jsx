import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { friendlyErrorMessage } from '../../api/client';
import { colors } from '../../theme/colors';
import { Icon } from '../../components/Icon';

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.card}>
          <Text style={styles.brand}>AJ Agency</Text>
          <Text style={styles.subtitle}>DISTRIBUTOR BILLING &amp; INVENTORY</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={submit}
              style={styles.passwordInput}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} size={20} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.card, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  brand: { fontSize: 26, fontWeight: '700', color: colors.gold, textAlign: 'center' },
  subtitle: { fontSize: 10, letterSpacing: 1.5, color: colors.inkMuted, textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', color: colors.inkMuted, marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, paddingRight: 8 },
  passwordInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink },
  eyeButton: { padding: 6 },
  error: { color: colors.danger, fontSize: 13, marginTop: 12 },
  button: { backgroundColor: colors.success, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
