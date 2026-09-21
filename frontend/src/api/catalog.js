import { apiClient } from './client';

function makeCrud(path) {
  return {
    list: async () => (await apiClient.get(path)).data,
    create: async (data) => (await apiClient.post(path, data)).data,
    update: async (id, data) => (await apiClient.put(`${path}/${id}`, data)).data,
    remove: async (id) => (await apiClient.delete(`${path}/${id}`)).data,
  };
}

export const categoriesApi = makeCrud('/categories');
export const brandsApi = makeCrud('/brands');
export const productLinesApi = makeCrud('/product-lines');
export const taxCodesApi = makeCrud('/tax-codes');
export const stockUnitsApi = makeCrud('/stock-units');

export const categoryBrandsApi = {
  get: async (categoryId) => (await apiClient.get(`/categories/${categoryId}/brands`)).data,
  set: async (categoryId, brandIds) => (await apiClient.put(`/categories/${categoryId}/brands`, { brand_ids: brandIds })).data,
};

export const itemsApi = {
  list: async (search = '') => (await apiClient.get('/items', { params: { search } })).data,
  get: async (id) => (await apiClient.get(`/items/${id}`)).data,
  create: async (data) => (await apiClient.post('/items', data)).data,
  update: async (id, data) => (await apiClient.put(`/items/${id}`, data)).data,
  remove: async (id) => (await apiClient.delete(`/items/${id}`)).data,

  async uploadImage(id, file) {
    const form = new FormData();
    form.append('image', file);
    return (await apiClient.post(`/items/${id}/image`, form)).data;
  },
  removeImage: async (id) => (await apiClient.delete(`/items/${id}/image`)).data,

  async downloadExport() {
    const res = await apiClient.get('/items/export', { responseType: 'blob' });
    downloadBlob(res.data, 'items_export.xlsx');
  },

  async downloadImportTemplate() {
    const res = await apiClient.get('/items/import/template', { responseType: 'blob' });
    downloadBlob(res.data, 'items_import_template.xlsx');
  },

  async importPreview(file) {
    const form = new FormData();
    form.append('file', file);
    return (await apiClient.post('/items/import/preview', form)).data;
  },

  async importCommit(file) {
    const form = new FormData();
    form.append('file', file);
    return (await apiClient.post('/items/import/commit', form)).data;
  },
};

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
