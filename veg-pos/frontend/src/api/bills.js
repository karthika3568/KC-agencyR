import client from './client';

export const listBills = (params = {}) => client.get('/bills', { params }).then((r) => r.data);
export const getBill = (id) => client.get(`/bills/${id}`).then((r) => r.data);
export const createBill = (payload) => client.post('/bills', payload).then((r) => r.data);
export const updateBill = (id, payload) => client.put(`/bills/${id}`, payload).then((r) => r.data);
export const deleteBill = (id) => client.delete(`/bills/${id}`).then((r) => r.data);
export const getBillPrint = (id) => client.get(`/bills/${id}/print`).then((r) => r.data);

export const listHeldBills = () => client.get('/held-bills').then((r) => r.data);
export const holdBill = (payload) => client.post('/held-bills', payload).then((r) => r.data);
export const deleteHeldBill = (id) => client.delete(`/held-bills/${id}`).then((r) => r.data);
