import { useState, useCallback } from 'react';
import { productApi } from '../api/client';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productApi.getAll();
      setProducts(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProduct = useCallback(async (product: any) => {
    setError(null);
    try {
      const response = await productApi.create(product);
      setProducts((prev) => [...prev, response.data]);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
      throw err;
    }
  }, []);

  const updateProduct = useCallback(async (id: string, product: any) => {
    setError(null);
    try {
      const response = await productApi.update(id, product);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? response.data : p))
      );
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
      throw err;
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    setError(null);
    try {
      await productApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
      throw err;
    }
  }, []);

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
