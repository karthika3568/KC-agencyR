import client from './client';

export const listPayments = (params = {}) => client.get('/payments', { params }).then((r) => r.data);
export const getPayment = (id) => client.get(`/payments/${id}`).then((r) => r.data);
export const createPayment = (payload) => client.post('/payments', payload).then((r) => r.data);
export const deletePayment = (id) => client.delete(`/payments/${id}`).then((r) => r.data);

export const listPaymentMethods = (params = {}) => client.get('/payment-methods', { params }).then((r) => r.data);
export const createPaymentMethod = (payload) => client.post('/payment-methods', payload).then((r) => r.data);
export const updatePaymentMethod = (id, payload) => client.put(`/payment-methods/${id}`, payload).then((r) => r.data);
