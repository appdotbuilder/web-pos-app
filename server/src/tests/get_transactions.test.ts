
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { getTransactions } from '../handlers/get_transactions';

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const result = await getTransactions();
    expect(result).toEqual([]);
  });

  it('should return transactions with proper data types', async () => {
    // Create test user first
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

    const userId = userResult[0].id;

    // Create test transaction
    await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN001',
        user_id: userId,
        customer_name: 'Test Customer',
        customer_phone: '081234567890',
        subtotal: '100.00',
        tax_amount: '10.00',
        discount_amount: '5.00',
        total_amount: '105.00',
        payment_method: 'cash',
        payment_amount: '110.00',
        change_amount: '5.00',
        status: 'completed',
        notes: 'Test transaction'
      })
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(1);
    
    const transaction = result[0];
    expect(transaction.transaction_number).toEqual('TXN001');
    expect(transaction.user_id).toEqual(userId);
    expect(transaction.customer_name).toEqual('Test Customer');
    expect(transaction.customer_phone).toEqual('081234567890');
    expect(transaction.status).toEqual('completed');
    expect(transaction.payment_method).toEqual('cash');
    expect(transaction.notes).toEqual('Test transaction');
    
    // Verify numeric types
    expect(typeof transaction.subtotal).toBe('number');
    expect(transaction.subtotal).toEqual(100.00);
    expect(typeof transaction.tax_amount).toBe('number');
    expect(transaction.tax_amount).toEqual(10.00);
    expect(typeof transaction.discount_amount).toBe('number');
    expect(transaction.discount_amount).toEqual(5.00);
    expect(typeof transaction.total_amount).toBe('number');
    expect(transaction.total_amount).toEqual(105.00);
    expect(typeof transaction.payment_amount).toBe('number');
    expect(transaction.payment_amount).toEqual(110.00);
    expect(typeof transaction.change_amount).toBe('number');
    expect(transaction.change_amount).toEqual(5.00);
    
    // Verify other fields
    expect(transaction.id).toBeDefined();
    expect(transaction.created_at).toBeInstanceOf(Date);
    expect(transaction.updated_at).toBeInstanceOf(Date);
  });

  it('should return transactions ordered by creation date (newest first)', async () => {
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

    const userId = userResult[0].id;

    // Create multiple transactions with slight delay
    await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN001',
        user_id: userId,
        subtotal: '100.00',
        tax_amount: '0.00',
        discount_amount: '0.00',
        total_amount: '100.00',
        payment_method: 'cash',
        payment_amount: '100.00',
        change_amount: '0.00',
        status: 'completed'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN002',
        user_id: userId,
        subtotal: '200.00',
        tax_amount: '0.00',
        discount_amount: '0.00',
        total_amount: '200.00',
        payment_method: 'card',
        payment_amount: '200.00',
        change_amount: '0.00',
        status: 'completed'
      })
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(2);
    
    // Should be ordered by newest first
    expect(result[0].transaction_number).toEqual('TXN002');
    expect(result[1].transaction_number).toEqual('TXN001');
    
    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should limit results to 20 transactions', async () => {
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

    const userId = userResult[0].id;

    // Create 25 transactions
    const transactionValues = Array.from({ length: 25 }, (_, i) => ({
      transaction_number: `TXN${String(i + 1).padStart(3, '0')}`,
      user_id: userId,
      subtotal: '100.00',
      tax_amount: '0.00',
      discount_amount: '0.00',
      total_amount: '100.00',
      payment_method: 'cash' as const,
      payment_amount: '100.00',
      change_amount: '0.00',
      status: 'completed' as const
    }));

    await db.insert(transactionsTable)
      .values(transactionValues)
      .execute();

    const result = await getTransactions();

    // Should return only 20 transactions due to limit
    expect(result).toHaveLength(20);
    
    // All should have proper numeric types
    result.forEach(transaction => {
      expect(typeof transaction.subtotal).toBe('number');
      expect(typeof transaction.total_amount).toBe('number');
      expect(typeof transaction.payment_amount).toBe('number');
    });
  });
});
