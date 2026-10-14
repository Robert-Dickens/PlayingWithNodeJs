import axios from 'axios';

export interface ProductDetail {
  id: string;
  product_id: string;
  sku: string;
  weight?: number | string | null;
  dimensions?: string | null;
  color?: string | null;
  material?: string | null;
  created_at: string;
  updated_at: string;
}

const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const API_BASE_URL = configuredApiUrl.replace(/\/$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/$/, '')
  : `${configuredApiUrl.replace(/\/$/, '')}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const productApi = {
  getAll: () => apiClient.get('/products'),
  getById: (id: string) => apiClient.get(`/products/${id}`),
  create: (data: { name: string; description?: string; price: number; stock_quantity?: number }) => apiClient.post('/products', data),
  update: (id: string, data: Partial<{ name: string; description: string; price: number; stock_quantity: number }>) => apiClient.put(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`),
};

export const productDetailApi = {
  getByProductId: (productId: string) => apiClient.get<ProductDetail>(`/product-details/product/${productId}`),
  create: (data: Omit<ProductDetail, 'id' | 'created_at' | 'updated_at'>) => apiClient.post<ProductDetail>('/product-details', data),
  update: (id: string, data: Partial<Omit<ProductDetail, 'id' | 'created_at' | 'updated_at'>>) => apiClient.put<ProductDetail>(`/product-details/${id}`, data),
  delete: (id: string) => apiClient.delete(`/product-details/${id}`),
};
