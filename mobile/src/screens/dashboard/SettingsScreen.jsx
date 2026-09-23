import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/admin';
import { friendlyErrorMessage } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { formStyles } from '../../components/FormModal';

export function SettingsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const branchQuery = useQuery({ queryKey: ['settings-branch'], queryFn: settingsApi.getBranch });
  const [form, setForm] = useState(null);

  const branch = form || branchQuery.data;
  const updateMutation = useMutation({
    mutationFn: settingsApi.updateBranch,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings-branch'] }); Alert.alert('Saved'); },
    onError: (e) => Alert.alert('Error', friendlyErrorMessage(e)),
  });

  if (!branch) return <View style={styles.screen} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.email} · {user?.role}</Text>
      </View>

      <Text style={styles.sectionTitle}>Branch Profile</Text>
      <View style={styles.card}>
        <Text style={formStyles.label}>Branch Name</Text>
        <TextInput value={branch.branch_name} onChangeText={(v) => setForm({ ...branch, branch_name: v })} style={formStyles.input} />
        <Text style={formStyles.label}>Phone</Text>
        <TextInput value={branch.phone || ''} onChangeText={(v) => setForm({ ...branch, phone: v })} style={formStyles.input} />
        <Text style={formStyles.label}>GSTIN</Text>
        <TextInput value={branch.gstin || ''} onChangeText={(v) => setForm({ ...branch, gstin: v })} style={formStyles.input} />
        <TouchableOpacity style={[formStyles.primaryBtn, { marginTop: 12 }]} onPress={() => updateMutation.mutate(branch)}>
          <Text style={formStyles.primaryBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  sectionTitle: { fontWeight: '700', color: colors.ink, marginBottom: 8, marginTop: 12 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  name: { fontWeight: '700', color: colors.ink },
  meta: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
});
