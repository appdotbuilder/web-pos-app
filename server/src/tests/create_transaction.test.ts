
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, transactionsTable, transactionItemsTable, stockMovementsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testProductId: number;
  let testUserId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();

    // Create test product with stock
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Product for testing',
        price: '19.99',
        cost: '10.00',
        stock_quantity: 100,
        min_stock: 5,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();
    testProductId = productResult[0].id;
  });

  const createTestInput = (overrides: Partial<CreateTransactionInput> = {}): CreateTransactionInput => ({
    customer_name: 'John Doe',
    customer_phone: '+1234567890',
    items: [
      {
        product_id: testProductId,
        quantity: 2,
        unit_price: 19.99
      }
    ],
    discount_amount: 5.00,
    tax_rate: 0.1,
    payment_method: 'cash',
    payment_amount: 50.00,
    notes: 'Test transaction',
    ...overrides
  });

  it('should create a transaction with correct calculations', async () => {
    const input = createTestInput();
    const result = await createTransaction(input);

    // Verify basic transaction fields
    expect(result.customer_name).toEqual('John Doe');
    expect(result.customer_phone).toEqual('+1234567890');
    expect(result.payment_method).toEqual('cash');
    expect(result.status).toEqual('completed');
    expect(result.notes).toEqual('Test transaction');
    expect(result.id).toBeDefined();
    expect(result.transaction_number).toMatch(/^TXN-\d+$/);

    // Verify calculations with floating-point tolerance
    expect(result.subtotal).toEqual(39.98); // 2 * 19.99
    expect(result.tax_amount).toBeCloseTo(3.998, 2); // 39.98 * 0.1 (allow floating-point precision)
    expect(result.discount_amount).toEqual(5.00);
    expect(result.total_amount).toBeCloseTo(38.978, 2); // 39.98 + 3.998 - 5.00
    expect(result.payment_amount).toEqual(50.00);
    expect(result.change_amount).toBeCloseTo(11.022, 2); // 50.00 - 38.978

    // Verify numeric types
    expect(typeof result.subtotal).toBe('number');
    expect(typeof result.tax_amount).toBe('number');
    expect(typeof result.total_amount).toBe('number');
  });

  it('should save transaction to database', async () => {
    const input = createTestInput();
    const result = await createTransaction(input);

    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].customer_name).toEqual('John Doe');
    expect(parseFloat(transactions[0].subtotal)).toEqual(39.98);
  });

  it('should create transaction items', async () => {
    const input = createTestInput();
    const result = await createTransaction(input);

    const items = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].product_id).toEqual(testProductId);
    expect(items[0].quantity).toEqual(2);
    expect(parseFloat(items[0].unit_price)).toEqual(19.99);
    expect(parseFloat(items[0].total_price)).toEqual(39.98);
  });

  it('should update product stock quantity', async () => {
    const input = createTestInput();
    await createTransaction(input);

    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    expect(products[0].stock_quantity).toEqual(98); // 100 - 2
  });

  it('should create stock movement records', async () => {
    const input = createTestInput();
    const result = await createTransaction(input);

    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.reference_id, result.id))
      .execute();

    expect(movements).toHaveLength(1);
    expect(movements[0].product_id).toEqual(testProductId);
    expect(movements[0].type).toEqual('out');
    expect(movements[0].quantity).toEqual(-2); // Negative for outgoing
    expect(movements[0].reference_type).toEqual('transaction');
    expect(movements[0].notes).toMatch(/Sale transaction TXN-\d+/);
  });

  it('should handle multiple items correctly', async () => {
    // Create second product
    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 2',
        description: 'Second product for testing',
        price: '25.00',
        cost: '15.00',
        stock_quantity: 50,
        min_stock: 5
      })
      .returning()
      .execute();

    const input = createTestInput({
      items: [
        { product_id: testProductId, quantity: 1, unit_price: 19.99 },
        { product_id: product2Result[0].id, quantity: 3, unit_price: 25.00 }
      ]
    });

    const result = await createTransaction(input);

    // Verify calculations with multiple items
    expect(result.subtotal).toEqual(94.99); // 19.99 + (3 * 25.00)

    // Verify transaction items
    const items = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, result.id))
      .execute();

    expect(items).toHaveLength(2);

    // Verify stock movements
    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.reference_id, result.id))
      .execute();

    expect(movements).toHaveLength(2);
  });

  it('should handle zero tax rate', async () => {
    const input = createTestInput({ tax_rate: 0 });
    const result = await createTransaction(input);

    expect(result.tax_amount).toEqual(0);
    expect(result.total_amount).toEqual(34.98); // 39.98 - 5.00 (no tax)
  });

  it('should handle zero discount', async () => {
    const input = createTestInput({ discount_amount: 0 });
    const result = await createTransaction(input);

    expect(result.discount_amount).toEqual(0);
    expect(result.total_amount).toBeCloseTo(43.978, 2); // 39.98 + 3.998 (no discount) - allow floating-point precision
  });

  it('should throw error for non-existent product', async () => {
    const input = createTestInput({
      items: [{ product_id: 99999, quantity: 1, unit_price: 10.00 }]
    });

    expect(createTransaction(input)).rejects.toThrow(/Product with ID 99999 not found/i);
  });

  it('should throw error for insufficient stock', async () => {
    const input = createTestInput({
      items: [{ product_id: testProductId, quantity: 150, unit_price: 19.99 }]
    });

    expect(createTransaction(input)).rejects.toThrow(/Insufficient stock/i);
  });
});
