import client from './client';

export const getSettings = () => client.get('/settings').then((r) => r.data);
export const updateSettings = (payload) => client.put('/settings', payload).then((r) => r.data);
export const getSequences = () => client.get('/settings/sequences').then((r) => r.data);
export const updateSequence = (id, payload) => client.put(`/settings/sequences/${id}`, payload).then((r) => r.data);

export const listUsers = () => client.get('/users').then((r) => r.data);
export const createUser = (payload) => client.post('/users', payload).then((r) => r.data);
export const updateUser = (id, payload) => client.put(`/users/${id}`, payload).then((r) => r.data);

export const getAuditLog = () => client.get('/audit-log').then((r) => r.data);
