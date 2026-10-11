import client from './client';

export const listPurchases = (params = {}) => client.get('/purchases', { params }).then((r) => r.data);
export const getPurchase = (id) => client.get(`/purchases/${id}`).then((r) => r.data);
export const createPurchase = (payload) => client.post('/purchases', payload).then((r) => r.data);
export const updatePurchase = (id, payload) => client.put(`/purchases/${id}`, payload).then((r) => r.data);
export const deletePurchase = (id) => client.delete(`/purchases/${id}`).then((r) => r.data);
