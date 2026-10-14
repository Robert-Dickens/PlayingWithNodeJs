import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const productApi = {
  getAll: () => apiClient.get('/products'),
  getById: (id: string) => apiClient.get(`/products/${id}`),
  create: (data: any) => apiClient.post('/products', data),
  update: (id: string, data: any) => apiClient.put(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`),
};

export const productDetailApi = {
  getByProductId: (productId: string) => apiClient.get(`/product-details/product/${productId}`),
  create: (data: any) => apiClient.post('/product-details', data),
  update: (id: string, data: any) => apiClient.put(`/product-details/${id}`, data),
  delete: (id: string) => apiClient.delete(`/product-details/${id}`),
};
