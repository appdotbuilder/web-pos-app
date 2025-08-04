
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { getTransactionDetails } from '../handlers/get_transaction_details';

describe('getTransactionDetails', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get transaction with items', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();

    // Create test products
    const productResults = await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          description: 'Test product 1',
          price: '10.50',
          cost: '5.00',
          stock_quantity: 100
        },
        {
          name: 'Product 2',
          description: 'Test product 2',
          price: '20.00',
          cost: '10.00',
          stock_quantity: 50
        }
      ])
      .returning()
      .execute();

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN-001',
        user_id: userResult[0].id,
        customer_name: 'John Doe',
        customer_phone: '123456789',
        subtotal: '30.50',
        tax_amount: '3.05',
        discount_amount: '0.00',
        total_amount: '33.55',
        payment_method: 'cash',
        payment_amount: '40.00',
        change_amount: '6.45',
        status: 'completed'
      })
      .returning()
      .execute();

    // Create transaction items
    await db.insert(transactionItemsTable)
      .values([
        {
          transaction_id: transactionResult[0].id,
          product_id: productResults[0].id,
          quantity: 1,
          unit_price: '10.50',
          total_price: '10.50'
        },
        {
          transaction_id: transactionResult[0].id,
          product_id: productResults[1].id,
          quantity: 1,
          unit_price: '20.00',
          total_price: '20.00'
        }
      ])
      .execute();

    const result = await getTransactionDetails(transactionResult[0].id);

    // Verify transaction details
    expect(result.id).toEqual(transactionResult[0].id);
    expect(result.transaction_number).toEqual('TXN-001');
    expect(result.user_id).toEqual(userResult[0].id);
    expect(result.customer_name).toEqual('John Doe');
    expect(result.customer_phone).toEqual('123456789');
    expect(result.subtotal).toEqual(30.50);
    expect(result.tax_amount).toEqual(3.05);
    expect(result.discount_amount).toEqual(0.00);
    expect(result.total_amount).toEqual(33.55);
    expect(result.payment_method).toEqual('cash');
    expect(result.payment_amount).toEqual(40.00);
    expect(result.change_amount).toEqual(6.45);
    expect(result.status).toEqual('completed');

    // Verify numeric types
    expect(typeof result.subtotal).toBe('number');
    expect(typeof result.tax_amount).toBe('number');
    expect(typeof result.total_amount).toBe('number');

    // Verify items
    expect(result.items).toHaveLength(2);
    expect(result.items[0].product_id).toEqual(productResults[0].id);
    expect(result.items[0].quantity).toEqual(1);
    expect(result.items[0].unit_price).toEqual(10.50);
    expect(result.items[0].total_price).toEqual(10.50);
    expect(typeof result.items[0].unit_price).toBe('number');
    expect(typeof result.items[0].total_price).toBe('number');

    expect(result.items[1].product_id).toEqual(productResults[1].id);
    expect(result.items[1].quantity).toEqual(1);
    expect(result.items[1].unit_price).toEqual(20.00);
    expect(result.items[1].total_price).toEqual(20.00);
  });

  it('should throw error for non-existent transaction', async () => {
    await expect(getTransactionDetails(999)).rejects.toThrow(/not found/i);
  });

  it('should return transaction with empty items array', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'kasir'
      })
      .returning()
      .execute();

    // Create transaction without items
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN-002',
        user_id: userResult[0].id,
        subtotal: '0.00',
        tax_amount: '0.00',
        discount_amount: '0.00',
        total_amount: '0.00',
        payment_method: 'cash',
        payment_amount: '0.00',
        change_amount: '0.00',
        status: 'pending'
      })
      .returning()
      .execute();

    const result = await getTransactionDetails(transactionResult[0].id);

    expect(result.id).toEqual(transactionResult[0].id);
    expect(result.items).toHaveLength(0);
    expect(Array.isArray(result.items)).toBe(true);
  });
});
