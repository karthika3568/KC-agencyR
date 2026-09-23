import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { itemsApi, categoriesApi, brandsApi, stockUnitsApi, taxCodesApi } from '../../api/catalog';
import { friendlyErrorMessage } from '../../api/client';
import { FormModal, formStyles } from '../../components/FormModal';
import { SelectField } from '../../components/SelectField';
import { resolveImageUrl } from '../../utils/media';
import { colors } from '../../theme/colors';

export function ItemFormModal({ item, onClose }) {
  const isEdit = !!item;
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const brandsQuery = useQuery({ queryKey: ['brands'], queryFn: brandsApi.list });
  const unitsQuery = useQuery({ queryKey: ['stock-units'], queryFn: stockUnitsApi.list });
  const taxQuery = useQuery({ queryKey: ['tax-codes'], queryFn: taxCodesApi.list });

  const [form, setForm] = useState({
    item_name: item?.item_name || '',
    category_id: item?.category_id || null,
    brand_id: item?.brand_id || null,
    base_unit_id: item?.base_unit_id || null,
    tax_code_id: item?.tax_code_id || null,
    retail_price: String(item?.retail_price ?? ''),
    mrp: String(item?.mrp ?? ''),
    purchase_price: String(item?.purchase_price ?? ''),
    barcode: item?.barcode || '',
  });
  const [imageAsset, setImageAsset] = useState(null);
  const [imagePreview, setImagePreview] = useState(item?.image ? resolveImageUrl(item.image) : null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const createMutation = useMutation({ mutationFn: itemsApi.create });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => itemsApi.update(id, data) });
  const uploadMutation = useMutation({ mutationFn: ({ id, asset }) => itemsApi.uploadImage(id, asset) });

  const pickImage = async (fromCamera) => {
    const result = await (fromCamera ? launchCamera({ mediaType: 'photo', quality: 0.7 }) : launchImageLibrary({ mediaType: 'photo', quality: 0.7 }));
    const asset = result.assets?.[0];
    if (!asset) return;
    setImageAsset(asset);
    setImagePreview(asset.uri);
  };

  const submit = async () => {
    setError('');
    if (!form.item_name || !form.base_unit_id) {
      setError('Item name and base unit are required.');
      return;
    }
    const payload = {
      item_name: form.item_name,
      category_id: form.category_id,
      brand_id: form.brand_id,
      base_unit_id: form.base_unit_id,
      tax_code_id: form.tax_code_id,
      retail_price: Number(form.retail_price || 0),
      mrp: Number(form.mrp || 0),
      purchase_price: Number(form.purchase_price || 0),
      barcode: form.barcode || null,
      is_active: 1,
    };
    try {
      let id = item?.id;
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: payload });
      } else {
        const created = await createMutation.mutateAsync(payload);
        id = created.id;
      }
      if (imageAsset) {
        await uploadMutation.mutateAsync({ id, asset: imageAsset });
      }
      queryClient.invalidateQueries({ queryKey: ['items'] });
      onClose();
    } catch (err) {
      setError(friendlyErrorMessage(err));
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending || uploadMutation.isPending;

  return (
    <FormModal
      visible
      title={isEdit ? `Edit ${item.item_name}` : 'New Item'}
      onClose={onClose}
      footer={
        <>
          <TouchableOpacity style={formStyles.secondaryBtn} onPress={onClose}><Text style={formStyles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[formStyles.primaryBtn, saving && formStyles.disabled]} onPress={submit} disabled={saving}>
            <Text style={formStyles.primaryBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </>
      }
    >
      <View style={styles.imageRow}>
        <View style={styles.imageBox}>
          {imagePreview ? <Image source={{ uri: imagePreview }} style={{ width: '100%', height: '100%' }} /> : <Text style={styles.imagePlaceholder}>No image</Text>}
        </View>
        <View style={{ marginLeft: 12, gap: 8 }}>
          <TouchableOpacity style={formStyles.secondaryBtn} onPress={() => pickImage(true)}><Text style={formStyles.secondaryBtnText}>Camera</Text></TouchableOpacity>
          <TouchableOpacity style={formStyles.secondaryBtn} onPress={() => pickImage(false)}><Text style={formStyles.secondaryBtnText}>Gallery</Text></TouchableOpacity>
        </View>
      </View>

      <Text style={formStyles.label}>Item Name *</Text>
      <TextInput value={form.item_name} onChangeText={(v) => set('item_name', v)} style={formStyles.input} />

      <SelectField label="Category" value={form.category_id} options={categoriesQuery.data || []} onChange={(v) => set('category_id', v)} />
      <SelectField label="Brand" value={form.brand_id} options={brandsQuery.data || []} onChange={(v) => set('brand_id', v)} />
      <SelectField label="Base Unit *" value={form.base_unit_id} options={unitsQuery.data || []} labelKey="short_code" onChange={(v) => set('base_unit_id', v)} />
      <SelectField label="Tax Code" value={form.tax_code_id} options={taxQuery.data || []} labelKey="code" onChange={(v) => set('tax_code_id', v)} />

      <Text style={formStyles.label}>Barcode</Text>
      <TextInput value={form.barcode} onChangeText={(v) => set('barcode', v)} style={formStyles.input} />

      <View style={formStyles.row}>
        <View style={{ flex: 1 }}>
          <Text style={formStyles.label}>Retail Price</Text>
          <TextInput keyboardType="numeric" value={form.retail_price} onChangeText={(v) => set('retail_price', v)} style={formStyles.input} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={formStyles.label}>MRP</Text>
          <TextInput keyboardType="numeric" value={form.mrp} onChangeText={(v) => set('mrp', v)} style={formStyles.input} />
        </View>
      </View>
      <Text style={formStyles.label}>Purchase Price</Text>
      <TextInput keyboardType="numeric" value={form.purchase_price} onChangeText={(v) => set('purchase_price', v)} style={formStyles.input} />

      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </FormModal>
  );
}

const styles = StyleSheet.create({
  imageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  imageBox: { width: 80, height: 80, borderRadius: 10, backgroundColor: colors.page, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSoft },
  imagePlaceholder: { fontSize: 10, color: colors.inkMuted },
});
