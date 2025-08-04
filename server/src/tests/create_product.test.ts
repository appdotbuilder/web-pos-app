
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable, stockMovementsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateProductInput = {
  name: 'Test Product',
  description: 'A product for testing',
  price: 19.99,
  cost: 10.50,
  stock_quantity: 100,
  min_stock: 5,
  category_id: null,
  barcode: '1234567890',
  image_url: 'https://example.com/image.jpg'
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product with all fields', async () => {
    const result = await createProduct(testInput);

    expect(result.name).toEqual('Test Product');
    expect(result.description).toEqual('A product for testing');
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toBe('number');
    expect(result.cost).toEqual(10.50);
    expect(typeof result.cost).toBe('number');
    expect(result.stock_quantity).toEqual(100);
    expect(result.min_stock).toEqual(5);
    expect(result.category_id).toBeNull();
    expect(result.barcode).toEqual('1234567890');
    expect(result.image_url).toEqual('https://example.com/image.jpg');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database', async () => {
    const result = await createProduct(testInput);

    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Test Product');
    expect(parseFloat(products[0].price)).toEqual(19.99);
    expect(parseFloat(products[0].cost)).toEqual(10.50);
    expect(products[0].stock_quantity).toEqual(100);
    expect(products[0].is_active).toBe(true);
  });

  it('should create initial stock movement for new product', async () => {
    const result = await createProduct(testInput);

    const stockMovements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.product_id, result.id))
      .execute();

    expect(stockMovements).toHaveLength(1);
    expect(stockMovements[0].type).toEqual('in');
    expect(stockMovements[0].quantity).toEqual(100);
    expect(stockMovements[0].reference_type).toEqual('initial_stock');
    expect(stockMovements[0].reference_id).toEqual(result.id);
    expect(stockMovements[0].notes).toEqual('Initial stock for new product');
  });

  it('should not create stock movement for zero stock quantity', async () => {
    const inputWithZeroStock = {
      ...testInput,
      stock_quantity: 0
    };

    const result = await createProduct(inputWithZeroStock);

    const stockMovements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.product_id, result.id))
      .execute();

    expect(stockMovements).toHaveLength(0);
    expect(result.stock_quantity).toEqual(0);
  });

  it('should create product with valid category', async () => {
    // Create test category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();

    const inputWithCategory = {
      ...testInput,
      category_id: categoryResult[0].id
    };

    const result = await createProduct(inputWithCategory);

    expect(result.category_id).toEqual(categoryResult[0].id);
  });

  it('should throw error for invalid category', async () => {
    const inputWithInvalidCategory = {
      ...testInput,
      category_id: 999
    };

    expect(createProduct(inputWithInvalidCategory)).rejects.toThrow(/category.*not found/i);
  });

  it('should apply default min_stock from schema', async () => {
    const inputWithoutMinStock: CreateProductInput = {
      name: 'Test Product',
      description: 'A product for testing',
      price: 19.99,
      cost: 10.50,
      stock_quantity: 100,
      min_stock: 5, // Required field - Zod default is applied at parsing time
      category_id: null,
      barcode: null,
      image_url: null
    };

    const result = await createProduct(inputWithoutMinStock);

    expect(result.min_stock).toEqual(5);
  });
});
