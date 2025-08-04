
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type UpdateProductInput, type CreateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

// Test input for creating initial product
const testCreateInput: CreateProductInput = {
  name: 'Original Product',
  description: 'Original description',
  price: 19.99,
  cost: 10.00,
  stock_quantity: 50,
  min_stock: 5,
  category_id: null,
  barcode: 'TEST123',
  image_url: 'http://example.com/image.jpg'
};

// Test input for updating product
const testUpdateInput: UpdateProductInput = {
  id: 1, // Will be set after creating initial product
  name: 'Updated Product',
  description: 'Updated description',
  price: 29.99,
  cost: 15.00,
  stock_quantity: 75,
  min_stock: 10,
  barcode: 'UPDATED123',
  image_url: 'http://example.com/updated.jpg',
  is_active: false
};

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a product with all fields', async () => {
    // Create initial product
    const initialProduct = await db.insert(productsTable)
      .values({
        name: testCreateInput.name,
        description: testCreateInput.description,
        price: testCreateInput.price.toString(),
        cost: testCreateInput.cost.toString(),
        stock_quantity: testCreateInput.stock_quantity,
        min_stock: testCreateInput.min_stock,
        category_id: testCreateInput.category_id,
        barcode: testCreateInput.barcode,
        image_url: testCreateInput.image_url
      })
      .returning()
      .execute();

    const productId = initialProduct[0].id;
    const updateInput = { ...testUpdateInput, id: productId };

    const result = await updateProduct(updateInput);

    // Verify all updated fields
    expect(result.id).toEqual(productId);
    expect(result.name).toEqual('Updated Product');
    expect(result.description).toEqual('Updated description');
    expect(result.price).toEqual(29.99);
    expect(result.cost).toEqual(15.00);
    expect(result.stock_quantity).toEqual(75);
    expect(result.min_stock).toEqual(10);
    expect(result.barcode).toEqual('UPDATED123');
    expect(result.image_url).toEqual('http://example.com/updated.jpg');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    // Create initial product
    const initialProduct = await db.insert(productsTable)
      .values({
        name: testCreateInput.name,
        description: testCreateInput.description,
        price: testCreateInput.price.toString(),
        cost: testCreateInput.cost.toString(),
        stock_quantity: testCreateInput.stock_quantity,
        min_stock: testCreateInput.min_stock,
        category_id: testCreateInput.category_id,
        barcode: testCreateInput.barcode,
        image_url: testCreateInput.image_url
      })
      .returning()
      .execute();

    const productId = initialProduct[0].id;
    
    // Update only name and price
    const partialUpdate: UpdateProductInput = {
      id: productId,
      name: 'Partially Updated Product',
      price: 39.99
    };

    const result = await updateProduct(partialUpdate);

    // Verify updated fields
    expect(result.name).toEqual('Partially Updated Product');
    expect(result.price).toEqual(39.99);
    
    // Verify unchanged fields
    expect(result.description).toEqual('Original description');
    expect(result.cost).toEqual(10.00);
    expect(result.stock_quantity).toEqual(50);
    expect(result.min_stock).toEqual(5);
    expect(result.barcode).toEqual('TEST123');
    expect(result.image_url).toEqual('http://example.com/image.jpg');
    expect(result.is_active).toEqual(true); // Default value
  });

  it('should save updated product to database', async () => {
    // Create initial product
    const initialProduct = await db.insert(productsTable)
      .values({
        name: testCreateInput.name,
        description: testCreateInput.description,
        price: testCreateInput.price.toString(),
        cost: testCreateInput.cost.toString(),
        stock_quantity: testCreateInput.stock_quantity,
        min_stock: testCreateInput.min_stock,
        category_id: testCreateInput.category_id,
        barcode: testCreateInput.barcode,
        image_url: testCreateInput.image_url
      })
      .returning()
      .execute();

    const productId = initialProduct[0].id;
    const updateInput = { ...testUpdateInput, id: productId };

    await updateProduct(updateInput);

    // Query database to verify changes were saved
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Updated Product');
    expect(products[0].description).toEqual('Updated description');
    expect(parseFloat(products[0].price)).toEqual(29.99);
    expect(parseFloat(products[0].cost)).toEqual(15.00);
    expect(products[0].stock_quantity).toEqual(75);
    expect(products[0].min_stock).toEqual(10);
    expect(products[0].is_active).toEqual(false);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update product with valid category_id', async () => {
    // Create a category first
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    const categoryId = category[0].id;

    // Create initial product
    const initialProduct = await db.insert(productsTable)
      .values({
        name: testCreateInput.name,
        description: testCreateInput.description,
        price: testCreateInput.price.toString(),
        cost: testCreateInput.cost.toString(),
        stock_quantity: testCreateInput.stock_quantity,
        min_stock: testCreateInput.min_stock,
        category_id: testCreateInput.category_id,
        barcode: testCreateInput.barcode,
        image_url: testCreateInput.image_url
      })
      .returning()
      .execute();

    const productId = initialProduct[0].id;
    
    const updateInput: UpdateProductInput = {
      id: productId,
      category_id: categoryId
    };

    const result = await updateProduct(updateInput);

    expect(result.category_id).toEqual(categoryId);
  });

  it('should handle numeric type conversions correctly', async () => {
    // Create initial product
    const initialProduct = await db.insert(productsTable)
      .values({
        name: testCreateInput.name,
        description: testCreateInput.description,
        price: testCreateInput.price.toString(),
        cost: testCreateInput.cost.toString(),
        stock_quantity: testCreateInput.stock_quantity,
        min_stock: testCreateInput.min_stock,
        category_id: testCreateInput.category_id,
        barcode: testCreateInput.barcode,
        image_url: testCreateInput.image_url
      })
      .returning()
      .execute();

    const productId = initialProduct[0].id;
    
    const updateInput: UpdateProductInput = {
      id: productId,
      price: 99.95,
      cost: 49.99
    };

    const result = await updateProduct(updateInput);

    // Verify numeric fields are returned as numbers
    expect(typeof result.price).toBe('number');
    expect(typeof result.cost).toBe('number');
    expect(result.price).toEqual(99.95);
    expect(result.cost).toEqual(49.99);
  });

  it('should throw error when product does not exist', async () => {
    const updateInput: UpdateProductInput = {
      id: 999, // Non-existent ID
      name: 'Updated Product'
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/Product with id 999 not found/i);
  });
});
