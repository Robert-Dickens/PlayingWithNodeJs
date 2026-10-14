import { query } from '../database/postgres';
import { cacheGet, cacheSet, cacheClear } from '../database/redis';
import { redisClient } from '../database/redis';
import { publishProductEvent } from '../database/rabbitmq';
import {
  Product,
  ProductDetail,
  CreateProductInput,
  UpdateProductInput,
  CreateProductDetailInput,
  UpdateProductDetailInput,
} from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export class ProductService {
  static async getAllProducts(): Promise<Product[]> {
    const cacheKey = 'products:all';
    const cached = await cacheGet<Product[]>(cacheKey);
    if (cached) return cached;

    const result = await query('SELECT * FROM products ORDER BY created_at DESC');
    const products = result.rows as Product[];
    
    await cacheSet(cacheKey, products, 600);
    return products;
  }

  static async getProductById(id: string): Promise<Product | null> {
    const cacheKey = `product:${id}`;
    const cached = await cacheGet<Product>(cacheKey);
    if (cached) return cached;

    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    const product = result.rows[0] as Product | undefined;
    
    if (product) {
      await cacheSet(cacheKey, product, 600);
    }
    return product || null;
  }

  static async createProduct(input: CreateProductInput): Promise<Product> {
    const id = uuidv4();
    const now = new Date();

    const result = await query(
      'INSERT INTO products (id, name, description, price, stock_quantity, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [id, input.name, input.description, input.price, input.stock_quantity, now, now]
    );

    const product = result.rows[0] as Product;
    
    // Invalidate cache
    await cacheClear('products:*');
    
    // Publish event
    await publishProductEvent('product.created', {
      id: product.id,
      name: product.name,
      price: product.price,
      timestamp: now.toISOString(),
    });

    return product;
  }

  static async updateProduct(id: string, input: UpdateProductInput): Promise<Product | null> {
    const product = await this.getProductById(id);
    if (!product) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(input.description);
    }
    if (input.price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(input.price);
    }
    if (input.stock_quantity !== undefined) {
      updates.push(`stock_quantity = $${paramCount++}`);
      values.push(input.stock_quantity);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    values.push(id);

    const result = await query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    const updated = result.rows[0] as Product;
    
    // Invalidate cache
    await cacheClear('products:*');
    
    // Publish event
    await publishProductEvent('product.updated', {
      id: updated.id,
      ...input,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  static async deleteProduct(id: string): Promise<boolean> {
    const result = await query('DELETE FROM products WHERE id = $1', [id]);
    
    if (result.rowCount === 0) return false;

    // Invalidate cache
    await cacheClear('products:*');
    
    // Publish event
    await publishProductEvent('product.deleted', {
      id,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  // Product Details
  static async getProductDetails(productId: string): Promise<ProductDetail | null> {
    const cacheKey = `product_detail:${productId}`;
    const cached = await cacheGet<ProductDetail>(cacheKey);
    if (cached) return cached;

    const result = await query('SELECT * FROM product_details WHERE product_id = $1', [productId]);
    const detail = result.rows[0] as ProductDetail | undefined;
    
    if (detail) {
      await cacheSet(cacheKey, detail, 600);
    }
    return detail || null;
  }

  static async createProductDetail(input: CreateProductDetailInput): Promise<ProductDetail> {
    const id = uuidv4();
    const now = new Date();

    const result = await query(
      'INSERT INTO product_details (id, product_id, sku, weight, dimensions, color, material, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [id, input.product_id, input.sku, input.weight, input.dimensions, input.color, input.material, now, now]
    );

    const detail = result.rows[0] as ProductDetail;
    
    // Invalidate cache
    await cacheClear('product_detail:*');
    
    return detail;
  }

  static async updateProductDetail(id: string, input: UpdateProductDetailInput): Promise<ProductDetail | null> {
    const result = await query('SELECT * FROM product_details WHERE id = $1', [id]);
    const detail = result.rows[0] as ProductDetail | undefined;
    if (!detail) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.sku !== undefined) {
      updates.push(`sku = $${paramCount++}`);
      values.push(input.sku);
    }
    if (input.weight !== undefined) {
      updates.push(`weight = $${paramCount++}`);
      values.push(input.weight);
    }
    if (input.dimensions !== undefined) {
      updates.push(`dimensions = $${paramCount++}`);
      values.push(input.dimensions);
    }
    if (input.color !== undefined) {
      updates.push(`color = $${paramCount++}`);
      values.push(input.color);
    }
    if (input.material !== undefined) {
      updates.push(`material = $${paramCount++}`);
      values.push(input.material);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    values.push(id);

    const updateResult = await query(
      `UPDATE product_details SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    const updated = updateResult.rows[0] as ProductDetail;
    
    // Invalidate cache
    await cacheClear('product_detail:*');
    
    return updated;
  }

  static async deleteProductDetail(id: string): Promise<boolean> {
    const result = await query('DELETE FROM product_details WHERE id = $1', [id]);
    return result.rowCount !== 0;
  }
}
