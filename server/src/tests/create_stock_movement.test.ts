
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stockMovementsTable, productsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateStockMovementInput } from '../schema';
import { createStockMovement } from '../handlers/create_stock_movement';
import { eq } from 'drizzle-orm';

describe('createStockMovement', () => {
  let testUserId: number;
  let testProductId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category for stock movements'
      })
      .returning()
      .execute();

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing stock movements',
        price: '19.99',
        cost: '10.50',
        stock_quantity: 100,
        min_stock: 5,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();
    testProductId = productResult[0].id;
  });

  afterEach(resetDB);

  it('should create stock movement with type "in"', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'in',
      quantity: 50,
      reference_type: 'purchase',
      reference_id: null,
      notes: 'Stock replenishment'
    };

    const result = await createStockMovement(input, testUserId);

    // Verify stock movement record
    expect(result.product_id).toEqual(testProductId);
    expect(result.type).toEqual('in');
    expect(result.quantity).toEqual(50);
    expect(result.reference_type).toEqual('purchase');
    expect(result.notes).toEqual('Stock replenishment');
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify product stock was updated (100 + 50 = 150)
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    
    expect(products[0].stock_quantity).toEqual(150);
  });

  it('should create stock movement with type "out"', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'out',
      quantity: 25,
      reference_type: 'sale',
      reference_id: 123,
      notes: null
    };

    const result = await createStockMovement(input, testUserId);

    // Verify stock movement record
    expect(result.product_id).toEqual(testProductId);
    expect(result.type).toEqual('out');
    expect(result.quantity).toEqual(25);
    expect(result.reference_type).toEqual('sale');
    expect(result.reference_id).toEqual(123);
    expect(result.user_id).toEqual(testUserId);

    // Verify product stock was updated (100 - 25 = 75)
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    
    expect(products[0].stock_quantity).toEqual(75);
  });

  it('should create stock movement with type "adjustment"', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'adjustment',
      quantity: 80,
      reference_type: 'inventory_count',
      reference_id: null,
      notes: 'Stock count adjustment'
    };

    const result = await createStockMovement(input, testUserId);

    // Verify stock movement record
    expect(result.type).toEqual('adjustment');
    expect(result.quantity).toEqual(80);

    // Verify product stock was set to adjustment quantity
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    
    expect(products[0].stock_quantity).toEqual(80);
  });

  it('should save stock movement to database', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'in',
      quantity: 30,
      reference_type: null,
      reference_id: null,
      notes: null
    };

    const result = await createStockMovement(input, testUserId);

    // Query database to verify record was saved
    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, result.id))
      .execute();

    expect(movements).toHaveLength(1);
    expect(movements[0].product_id).toEqual(testProductId);
    expect(movements[0].type).toEqual('in');
    expect(movements[0].quantity).toEqual(30);
    expect(movements[0].user_id).toEqual(testUserId);
  });

  it('should throw error for non-existent product', async () => {
    const input: CreateStockMovementInput = {
      product_id: 99999,
      type: 'in',
      quantity: 10,
      reference_type: null,
      reference_id: null,
      notes: null
    };

    await expect(createStockMovement(input, testUserId)).rejects.toThrow(/product not found/i);
  });

  it('should throw error when stock would go negative', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'out',
      quantity: 150, // More than current stock of 100
      reference_type: null,
      reference_id: null,
      notes: null
    };

    await expect(createStockMovement(input, testUserId)).rejects.toThrow(/insufficient stock/i);
  });

  it('should handle negative quantity for "in" type by taking absolute value', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      type: 'in',
      quantity: -20, // Negative quantity
      reference_type: null,
      reference_id: null,
      notes: null
    };

    const result = await createStockMovement(input, testUserId);

    // Verify stock increased by absolute value (100 + 20 = 120)
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    
    expect(products[0].stock_quantity).toEqual(120);
    expect(result.quantity).toEqual(-20); // Original quantity preserved in record
  });
});
