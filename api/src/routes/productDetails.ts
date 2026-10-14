import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ProductService } from '../services/productService';
import { CreateProductDetailInput, UpdateProductDetailInput } from '../models/types';

const router = Router();

/**
 * @swagger
 * /api/product-details/product/{productId}:
 *   get:
 *     summary: Get product details by product ID
 *     description: Retrieve details for a specific product
 *     tags:
 *       - Product Details
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductDetail'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/product/:productId', asyncHandler(async (req: Request, res: Response) => {
  const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
  const detail = await ProductService.getProductDetails(productId);
  if (!detail) {
    res.status(404).json({ error: 'Product detail not found' });
    return;
  }
  res.json(detail);
}));

/**
 * @swagger
 * /api/product-details:
 *   post:
 *     summary: Create product details
 *     description: Create detailed information for a product
 *     tags:
 *       - Product Details
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - sku
 *             properties:
 *               product_id:
 *                 type: string
 *                 format: uuid
 *               sku:
 *                 type: string
 *                 description: Stock keeping unit
 *               quantity:
 *                 type: integer
 *                 description: Available quantity
 *               warehouse_location:
 *                 type: string
 *                 description: Warehouse location
 *           example:
 *             product_id: "123e4567-e89b-12d3-a456-426614174000"
 *             sku: "LAPTOP-001"
 *             quantity: 50
 *             warehouse_location: "A-12-5"
 *     responses:
 *       201:
 *         description: Product details created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductDetail'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const input: CreateProductDetailInput = req.body;
  
  if (!input.product_id || !input.sku) {
    res.status(400).json({ error: 'Missing required fields: product_id, sku' });
    return;
  }

  const detail = await ProductService.createProductDetail(input);
  res.status(201).json(detail);
}));

/**
 * @swagger
 * /api/product-details/{id}:
 *   put:
 *     summary: Update product details
 *     description: Update details for a specific product
 *     tags:
 *       - Product Details
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The product detail ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sku:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               warehouse_location:
 *                 type: string
 *           example:
 *             quantity: 75
 *             warehouse_location: "B-5-3"
 *     responses:
 *       200:
 *         description: Product details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductDetail'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const input: UpdateProductDetailInput = req.body;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const detail = await ProductService.updateProductDetail(id, input);
  
  if (!detail) {
    res.status(404).json({ error: 'Product detail not found' });
    return;
  }
  res.json(detail);
}));

/**
 * @swagger
 * /api/product-details/{id}:
 *   delete:
 *     summary: Delete product details
 *     description: Delete details for a specific product
 *     tags:
 *       - Product Details
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The product detail ID
 *     responses:
 *       200:
 *         description: Product details deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deleted = await ProductService.deleteProductDetail(id);
  
  if (!deleted) {
    res.status(404).json({ error: 'Product detail not found' });
    return;
  }
  res.json({ message: 'Product detail deleted successfully' });
}));

export default router;
