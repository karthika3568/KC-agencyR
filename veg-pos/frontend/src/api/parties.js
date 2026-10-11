import client from './client';

export const listParties = (params = {}) => client.get('/parties', { params }).then((r) => r.data);
export const getParty = (id) => client.get(`/parties/${id}`).then((r) => r.data);
export const createParty = (payload) => client.post('/parties', payload).then((r) => r.data);
export const updateParty = (id, payload) => client.put(`/parties/${id}`, payload).then((r) => r.data);
export const deleteParty = (id) => client.delete(`/parties/${id}`).then((r) => r.data);
export const getPartyLedger = (id, params = {}) => client.get(`/parties/${id}/ledger`, { params }).then((r) => r.data);
export const getUnpaidDocuments = (id) => client.get(`/parties/${id}/unpaid-documents`).then((r) => r.data);
