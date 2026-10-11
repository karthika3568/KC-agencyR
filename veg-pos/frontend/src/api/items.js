import client from './client';

export const listItems = (params = {}) => client.get('/items', { params }).then((r) => r.data);
export const getItem = (id) => client.get(`/items/${id}`).then((r) => r.data);
export const createItem = (payload) => client.post('/items', payload).then((r) => r.data);
export const updateItem = (id, payload) => client.put(`/items/${id}`, payload).then((r) => r.data);
export const deleteItem = (id) => client.delete(`/items/${id}`).then((r) => r.data);
