import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Switch } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/admin';
import { friendlyErrorMessage } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { formStyles } from '../../components/FormModal';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { Icon } from '../../components/Icon';
import {
  getConfiguredPrinter, ensureBluetoothPermissions,
  isBluetoothEnabled, scanPairedDevices, connectPrinter, disconnectPrinter, testPrint,
} from '../../utils/printerService';
import { BranchesScreen } from './BranchesScreen';
import { StaffScreen } from './StaffScreen';

function ProfileTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const branchQuery = useQuery({ queryKey: ['settings-branch'], queryFn: settingsApi.getBranch });
  const [form, setForm] = useState(null);

  const branch = form || branchQuery.data || {};
  const updateMutation = useMutation({
    mutationFn: settingsApi.updateBranch,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings-branch'] }); Alert.alert('Saved', 'Branch details updated successfully.'); },
    onError: (e) => Alert.alert('Error', friendlyErrorMessage(e)),
  });

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
      <Text style={styles.sectionTitle}>Logged Account</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.email} · {user?.role || 'Staff'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Company / Branch Profile &amp; Billing Info</Text>
      <View style={styles.card}>
        <Text style={formStyles.label}>Branch Name</Text>
        <TextInput
          value={branch.branch_name || ''}
          onChangeText={(v) => setForm({ ...branch, branch_name: v })}
          style={formStyles.input}
        />
        <Text style={formStyles.label}>Print Name</Text>
        <TextInput
          value={branch.print_name || ''}
          onChangeText={(v) => setForm({ ...branch, print_name: v })}
          style={formStyles.input}
        />
        <Text style={formStyles.label}>Address</Text>
        <TextInput
          value={branch.address_line1 || ''}
          onChangeText={(v) => setForm({ ...branch, address_line1: v })}
          style={formStyles.input}
        />
        <Text style={formStyles.label}>Phone</Text>
        <TextInput
          value={branch.phone || ''}
          onChangeText={(v) => setForm({ ...branch, phone: v })}
          style={formStyles.input}
          keyboardType="phone-pad"
        />
        <Text style={formStyles.label}>Support Email</Text>
        <TextInput
          value={branch.support_email || ''}
          onChangeText={(v) => setForm({ ...branch, support_email: v })}
          style={formStyles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={formStyles.label}>GSTIN</Text>
        <TextInput
          value={branch.gstin || ''}
          onChangeText={(v) => setForm({ ...branch, gstin: v })}
          style={formStyles.input}
          autoCapitalize="characters"
        />
        <Text style={formStyles.label}>PAN Number</Text>
        <TextInput
          value={branch.pan_number || ''}
          onChangeText={(v) => setForm({ ...branch, pan_number: v })}
          style={formStyles.input}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={[formStyles.primaryBtn, { marginTop: 14 }]}
          onPress={() => updateMutation.mutate(branch)}
          disabled={updateMutation.isPending}
        >
          <Text style={formStyles.primaryBtnText}>{updateMutation.isPending ? 'Saving…' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InvoiceSequencesTab() {
  const queryClient = useQueryClient();
  const sequencesQuery = useQuery({ queryKey: ['settings-sequences'], queryFn: settingsApi.getSequences });
  const [edits, setEdits] = useState({});

  const saveMutation = useMutation({
    mutationFn: ({ id, prefix }) => settingsApi.updateSequence(id, prefix),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-sequences'] });
      Alert.alert('Saved', 'Invoice prefix updated.');
    },
    onError: (e) => Alert.alert('Error', friendlyErrorMessage(e)),
  });

  const sequences = sequencesQuery.data || [];

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
      <Text style={styles.sectionTitle}>Invoice Sequence Prefixes</Text>
      <Text style={styles.hint}>Only the prefix can be changed — the running number keeps counting so numbering never repeats.</Text>
      {sequencesQuery.isLoading && <ActivityIndicator style={{ marginTop: 20 }} />}
      {sequences.map((s) => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.name}>{s.series.replace('_', '-').replace(/\b\w/g, (c) => c.toUpperCase())}</Text>
          <Text style={styles.meta}>Next number: {s.current_number + 1}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TextInput
              value={edits[s.id] ?? s.prefix}
              onChangeText={(v) => setEdits((prev) => ({ ...prev, [s.id]: v }))}
              style={[formStyles.input, { flex: 1 }]}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={formStyles.primaryBtn}
              onPress={() => saveMutation.mutate({ id: s.id, prefix: edits[s.id] ?? s.prefix })}
              disabled={saveMutation.isPending}
            >
              <Text style={formStyles.primaryBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function PrinterSetupTab() {
  const printQuery = useQuery({ queryKey: ['settings-print'], queryFn: settingsApi.getPrint });
  const [form, setForm] = useState(null);
  useEffect(() => { if (printQuery.data && !form) setForm(printQuery.data); }, [printQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: settingsApi.updatePrint,
    onSuccess: (data) => { setForm(data); Alert.alert('Saved', 'Print preferences updated.'); },
    onError: (e) => Alert.alert('Error', friendlyErrorMessage(e)),
  });

  const [configured, setConfigured] = useState(undefined); // undefined = loading
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [busyAddress, setBusyAddress] = useState(null);
  const [testing, setTesting] = useState(false);

  const refreshConfigured = async () => setConfigured(await getConfiguredPrinter());
  useEffect(() => { refreshConfigured(); }, []);

  const scan = async () => {
    setScanning(true);
    setDevices([]);
    try {
      const granted = await ensureBluetoothPermissions();
      if (!granted) {
        Alert.alert('Permission required', 'Bluetooth permission was denied — enable it in Android Settings to pair a printer.');
        return;
      }
      const enabled = await isBluetoothEnabled();
      if (!enabled) {
        Alert.alert('Bluetooth is off', 'Turn on Bluetooth, pair your printer in Android Settings, then scan again.');
        return;
      }
      const found = await scanPairedDevices();
      setDevices(found);
      if (found.length === 0) {
        Alert.alert('No paired printers', 'Pair your thermal printer in Android Bluetooth settings first, then scan again.');
      }
    } catch (err) {
      Alert.alert('Scan failed', err?.message || 'Could not scan for Bluetooth devices.');
    } finally {
      setScanning(false);
    }
  };

  const connect = async (device) => {
    setBusyAddress(device.address);
    try {
      await connectPrinter(device);
      await refreshConfigured();
      Alert.alert('Connected', `Connected to ${device.name || device.address}.`);
    } catch (err) {
      Alert.alert('Connection failed', err?.message || 'Could not connect to this printer.');
    } finally {
      setBusyAddress(null);
    }
  };

  const forget = async () => {
    await disconnectPrinter();
    await refreshConfigured();
  };

  const runTestPrint = async () => {
    setTesting(true);
    try {
      await testPrint();
      Alert.alert('Test print sent', 'Check your printer for the test receipt.');
    } catch (err) {
      Alert.alert('Test print failed', err?.message || 'Could not reach the configured printer.');
    } finally {
      setTesting(false);
    }
  };

  if (!form) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
      <Text style={styles.sectionTitle}>Bluetooth Thermal Printer</Text>
      <View style={styles.card}>
        {configured === undefined ? (
          <ActivityIndicator />
        ) : configured ? (
          <View style={styles.printerRow}>
            <Icon name="printer" size={20} color={colors.success} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.name}>{configured.name || 'Unnamed printer'}</Text>
              <Text style={styles.meta}>{configured.address}</Text>
            </View>
            <TouchableOpacity onPress={forget} style={styles.forgetBtn}>
              <Text style={styles.forgetBtnText}>Forget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.meta}>No printer configured yet — scan and select one below.</Text>
        )}

        <TouchableOpacity style={[formStyles.primaryBtn, { marginTop: 12 }]} onPress={scan} disabled={scanning}>
          <Text style={formStyles.primaryBtnText}>{scanning ? 'Scanning…' : 'Scan Paired Devices'}</Text>
        </TouchableOpacity>

        {devices.map((d) => (
          <TouchableOpacity key={d.address} style={styles.deviceRow} onPress={() => connect(d)} disabled={busyAddress === d.address}>
            <Text style={styles.name}>{d.name || 'Unnamed device'}</Text>
            <Text style={styles.meta}>{busyAddress === d.address ? 'Connecting…' : d.address}</Text>
          </TouchableOpacity>
        ))}

        {configured && (
          <TouchableOpacity style={[formStyles.primaryBtn, { marginTop: 12, backgroundColor: colors.navbar }]} onPress={runTestPrint} disabled={testing}>
            <Text style={[formStyles.primaryBtnText, { color: colors.gold }]}>{testing ? 'Printing…' : 'Test Print'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Print Preferences</Text>
      <View style={styles.card}>
        <Text style={formStyles.label}>Printer type</Text>
        <View style={styles.segment}>
          {[['a4', 'A4'], ['thermal_58', '58mm'], ['thermal_80', '80mm']].map(([val, label]) => (
            <TouchableOpacity key={val} style={[styles.segmentBtn, form.printer_type === val && styles.segmentBtnActive]} onPress={() => setForm({ ...form, printer_type: val })}>
              <Text style={form.printer_type === val ? styles.segmentTextActive : styles.segmentText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={formStyles.label}>Default print copies</Text>
        <TextInput
          value={String(form.default_print_copies ?? 1)}
          onChangeText={(v) => setForm({ ...form, default_print_copies: v })}
          style={formStyles.input}
          keyboardType="numeric"
        />
        <View style={styles.switchRow}>
          <Text style={formStyles.label}>Show UPI QR on thermal receipt</Text>
          <Switch value={!!Number(form.show_upi_qr_on_thermal)} onValueChange={(v) => setForm({ ...form, show_upi_qr_on_thermal: v ? 1 : 0 })} />
        </View>
        <Text style={formStyles.label}>Bank account no.</Text>
        <TextInput value={form.bank_account_no ?? ''} onChangeText={(v) => setForm({ ...form, bank_account_no: v })} style={formStyles.input} />
        <Text style={formStyles.label}>Bank name</Text>
        <TextInput value={form.bank_name ?? ''} onChangeText={(v) => setForm({ ...form, bank_name: v })} style={formStyles.input} />
        <Text style={formStyles.label}>UPI ID</Text>
        <TextInput value={form.upi_id ?? ''} onChangeText={(v) => setForm({ ...form, upi_id: v })} style={formStyles.input} />
        <Text style={formStyles.label}>Invoice footer note</Text>
        <TextInput value={form.invoice_footer_note ?? ''} onChangeText={(v) => setForm({ ...form, invoice_footer_note: v })} style={formStyles.input} />
        <Text style={formStyles.label}>Terms &amp; conditions</Text>
        <TextInput value={form.terms_and_conditions ?? ''} onChangeText={(v) => setForm({ ...form, terms_and_conditions: v })} style={[formStyles.input, { height: 70 }]} multiline />
        <TouchableOpacity style={[formStyles.primaryBtn, { marginTop: 14 }]} onPress={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          <Text style={formStyles.primaryBtnText}>{saveMutation.isPending ? 'Saving…' : 'Save Preferences'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export function SettingsScreen() {
  const [tab, setTab] = useState('profile');

  return (
    <View style={styles.screen}>
      <SegmentedTabs
        tabs={[
          { key: 'profile', label: 'Company Profile' },
          { key: 'printer', label: 'Thermal Printer' },
          { key: 'sequences', label: 'Invoice Prefix' },
          { key: 'branches', label: 'Branches' },
          { key: 'staff', label: 'Staff' },
        ]}
        active={tab}
        onChange={setTab}
      />
      <View style={{ flex: 1, marginTop: 4 }}>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'printer' && <PrinterSetupTab />}
        {tab === 'sequences' && <InvoiceSequencesTab />}
        {tab === 'branches' && <BranchesScreen />}
        {tab === 'staff' && <StaffScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  tabContent: { flex: 1 },
  sectionTitle: { fontWeight: '700', color: colors.ink, marginBottom: 8, marginTop: 12 },
  hint: { color: colors.inkMuted, fontSize: 12, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 12 },
  name: { fontWeight: '700', color: colors.ink },
  meta: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  printerRow: { flexDirection: 'row', alignItems: 'center' },
  forgetBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.danger },
  forgetBtnText: { color: colors.danger, fontWeight: '600', fontSize: 12 },
  deviceRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft, marginTop: 8 },
  segment: { flexDirection: 'row', backgroundColor: colors.page, borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: colors.navbar },
  segmentText: { fontSize: 12, color: colors.inkMuted, fontWeight: '600' },
  segmentTextActive: { fontSize: 12, color: colors.gold, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 },
});
