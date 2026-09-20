import { apiClient } from './client';

function makeCrud(path) {
  return {
    list: async () => (await apiClient.get(path)).data,
    create: async (data) => (await apiClient.post(path, data)).data,
    update: async (id, data) => (await apiClient.put(`${path}/${id}`, data)).data,
    remove: async (id) => (await apiClient.delete(`${path}/${id}`)).data,
  };
}

export const routesApi = makeCrud('/routes');
export const citiesApi = makeCrud('/cities');
export const customersApi = makeCrud('/customers');
export const suppliersApi = makeCrud('/suppliers');
