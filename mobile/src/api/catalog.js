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

  /** asset: { uri, type, fileName } from react-native-image-picker */
  async uploadImage(id, asset) {
    const form = new FormData();
    form.append('image', { uri: asset.uri, type: asset.type || 'image/jpeg', name: asset.fileName || 'photo.jpg' });
    return (await apiClient.post(`/items/${id}/image`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  removeImage: async (id) => (await apiClient.delete(`/items/${id}/image`)).data,

  async imageSearch(asset) {
    const form = new FormData();
    form.append('image', { uri: asset.uri, type: asset.type || 'image/jpeg', name: asset.fileName || 'photo.jpg' });
    return (await apiClient.post('/items/image-search', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
};
