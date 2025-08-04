
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, categoriesTable, stockMovementsTable } from '../db/schema';
import { getStockMovements } from '../handlers/get_stock_movements';

describe('getStockMovements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no stock movements exist', async () => {
    const result = await getStockMovements();
    expect(result).toEqual([]);
  });

  it('should return all stock movements when no productId filter is provided', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create test category
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    // Create test products
    const [product1] = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        description: 'First test product',
        price: '10.00',
        cost: '5.00',
        stock_quantity: 100,
        min_stock: 10,
        category_id: category.id
      })
      .returning()
      .execute();

    const [product2] = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        description: 'Second test product',
        price: '20.00',
        cost: '10.00',
        stock_quantity: 50,
        min_stock: 5,
        category_id: category.id
      })
      .returning()
      .execute();

    // Create stock movements for both products
    await db.insert(stockMovementsTable)
      .values([
        {
          product_id: product1.id,
          type: 'in',
          quantity: 50,
          reference_type: 'purchase',
          reference_id: 1,
          notes: 'Initial stock',
          user_id: user.id
        },
        {
          product_id: product2.id,
          type: 'out',
          quantity: 10,
          reference_type: 'sale',
          reference_id: 2,
          notes: 'Sale transaction',
          user_id: user.id
        },
        {
          product_id: product1.id,
          type: 'adjustment',
          quantity: -5,
          reference_type: null,
          reference_id: null,
          notes: 'Stock adjustment',
          user_id: user.id
        }
      ])
      .execute();

    const result = await getStockMovements();

    expect(result).toHaveLength(3);
    expect(result[0].product_id).toBe(product1.id);
    expect(result[0].type).toBe('in');
    expect(result[0].quantity).toBe(50);
    expect(result[0].reference_type).toBe('purchase');
    expect(result[0].reference_id).toBe(1);
    expect(result[0].notes).toBe('Initial stock');
    expect(result[0].user_id).toBe(user.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter stock movements by product_id when provided', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create test category
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    // Create test products
    const [product1] = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        description: 'First test product',
        price: '10.00',
        cost: '5.00',
        stock_quantity: 100,
        min_stock: 10,
        category_id: category.id
      })
      .returning()
      .execute();

    const [product2] = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        description: 'Second test product',
        price: '20.00',
        cost: '10.00',
        stock_quantity: 50,
        min_stock: 5,
        category_id: category.id
      })
      .returning()
      .execute();

    // Create stock movements for both products
    await db.insert(stockMovementsTable)
      .values([
        {
          product_id: product1.id,
          type: 'in',
          quantity: 50,
          reference_type: 'purchase',
          reference_id: 1,
          notes: 'Initial stock for product 1',
          user_id: user.id
        },
        {
          product_id: product2.id,
          type: 'out',
          quantity: 10,
          reference_type: 'sale',
          reference_id: 2,
          notes: 'Sale for product 2',
          user_id: user.id
        },
        {
          product_id: product1.id,
          type: 'adjustment',
          quantity: -5,
          reference_type: null,
          reference_id: null,
          notes: 'Adjustment for product 1',
          user_id: user.id
        }
      ])
      .execute();

    const result = await getStockMovements(product1.id);

    expect(result).toHaveLength(2);
    result.forEach(movement => {
      expect(movement.product_id).toBe(product1.id);
    });

    expect(result[0].type).toBe('in');
    expect(result[0].notes).toBe('Initial stock for product 1');
    expect(result[1].type).toBe('adjustment');
    expect(result[1].notes).toBe('Adjustment for product 1');
  });

  it('should return empty array when filtering by non-existent product_id', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create test category and product
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    const [product] = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        description: 'Test product',
        price: '10.00',
        cost: '5.00',
        stock_quantity: 100,
        min_stock: 10,
        category_id: category.id
      })
      .returning()
      .execute();

    // Create stock movement
    await db.insert(stockMovementsTable)
      .values({
        product_id: product.id,
        type: 'in',
        quantity: 50,
        reference_type: 'purchase',
        reference_id: 1,
        notes: 'Initial stock',
        user_id: user.id
      })
      .execute();

    // Filter by non-existent product ID
    const result = await getStockMovements(999999);
    expect(result).toEqual([]);
  });

  it('should handle stock movements with null optional fields', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create test category and product
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    const [product] = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        description: 'Test product',
        price: '10.00',
        cost: '5.00',
        stock_quantity: 100,
        min_stock: 10,
        category_id: category.id
      })
      .returning()
      .execute();

    // Create stock movement with null optional fields
    await db.insert(stockMovementsTable)
      .values({
        product_id: product.id,
        type: 'adjustment',
        quantity: -5,
        reference_type: null,
        reference_id: null,
        notes: null,
        user_id: user.id
      })
      .execute();

    const result = await getStockMovements();

    expect(result).toHaveLength(1);
    expect(result[0].product_id).toBe(product.id);
    expect(result[0].type).toBe('adjustment');
    expect(result[0].quantity).toBe(-5);
    expect(result[0].reference_type).toBe(null);
    expect(result[0].reference_id).toBe(null);
    expect(result[0].notes).toBe(null);
    expect(result[0].user_id).toBe(user.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });
});
