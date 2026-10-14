export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProductDetail {
  id: string;
  product_id: string;
  sku: string;
  weight?: number;
  dimensions?: string;
  color?: string;
  material?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  stock_quantity?: number;
}

export interface CreateProductDetailInput {
  product_id: string;
  sku: string;
  weight?: number;
  dimensions?: string;
  color?: string;
  material?: string;
}

export interface UpdateProductDetailInput {
  sku?: string;
  weight?: number;
  dimensions?: string;
  color?: string;
  material?: string;
}
