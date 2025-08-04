
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type TransactionSearchInput } from '../schema';
import { searchTransactions } from '../handlers/search_transactions';

// Helper to create test user
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash',
      full_name: 'Test User',
      role: 'kasir'
    })
    .returning()
    .execute();
  return result[0];
};

// Helper to create test transaction
const createTestTransaction = async (userId: number, overrides: Partial<any> = {}) => {
  const result = await db.insert(transactionsTable)
    .values({
      transaction_number: `TXN-${Date.now()}-${Math.random()}`,
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
      notes: 'Test transaction',
      ...overrides
    })
    .returning()
    .execute();
  return result[0];
};

describe('searchTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all transactions with default pagination', async () => {
    const user = await createTestUser();
    await createTestTransaction(user.id);
    await createTestTransaction(user.id);

    const input: TransactionSearchInput = {
      limit: 20,
      offset: 0
    };

    const results = await searchTransactions(input);

    expect(results).toHaveLength(2);
    expect(results[0].subtotal).toEqual(100);
    expect(results[0].tax_amount).toEqual(10);
    expect(results[0].total_amount).toEqual(105);
    expect(typeof results[0].subtotal).toBe('number');
    expect(typeof results[0].total_amount).toBe('number');
  });

  it('should filter by date range', async () => {
    const user = await createTestUser();
    
    // Create transaction from yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await createTestTransaction(user.id, { created_at: yesterday });
    
    // Create transaction from today
    const today = new Date();
    await createTestTransaction(user.id, { created_at: today });

    // Search for today's transactions only
    const input: TransactionSearchInput = {
      start_date: today,
      limit: 20,
      offset: 0
    };

    const results = await searchTransactions(input);

    expect(results).toHaveLength(1);
    expect(results[0].created_at.getDate()).toEqual(today.getDate());
  });

  it('should filter by status', async () => {
    const user = await createTestUser();
    await createTestTransaction(user.id, { status: 'completed' });
    await createTestTransaction(user.id, { status: 'pending' });
    await createTestTransaction(user.id, { status: 'cancelled' });

    const input: TransactionSearchInput = {
      status: 'completed',
      limit: 20,
      offset: 0
    };

    const results = await searchTransactions(input);

    expect(results).toHaveLength(1);
    expect(results[0].status).toEqual('completed');
  });

  it('should filter by user_id', async () => {
    const user1 = await createTestUser();
    const user2 = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hash',
        full_name: 'Test User 2',
        role: 'kasir'
      })
      .returning()
      .execute()
      .then(r => r[0]);

    await createTestTransaction(user1.id);
    await createTestTransaction(user2.id);

    const input: TransactionSearchInput = {
      user_id: user1.id,
      limit: 20,
      offset: 0
    };

    const results = await searchTransactions(input);

    expect(results).toHaveLength(1);
    expect(results[0].user_id).toEqual(user1.id);
  });

  it('should apply pagination correctly', async () => {
    const user = await createTestUser();
    
    // Create 5 transactions
    for (let i = 0; i < 5; i++) {
      await createTestTransaction(user.id);
    }

    // Test first page with limit 2
    const firstPage: TransactionSearchInput = {
      limit: 2,
      offset: 0
    };

    const firstResults = await searchTransactions(firstPage);
    expect(firstResults).toHaveLength(2);

    // Test second page with limit 2
    const secondPage: TransactionSearchInput = {
      limit: 2,
      offset: 2
    };

    const secondResults = await searchTransactions(secondPage);
    expect(secondResults).toHaveLength(2);

    // Ensure different results
    expect(firstResults[0].id).not.toEqual(secondResults[0].id);
  });

  it('should combine multiple filters', async () => {
    const user1 = await createTestUser();
    const user2 = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hash',
        full_name: 'Test User 2',
        role: 'kasir'
      })
      .returning()
      .execute()
      .then(r => r[0]);

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Create various transactions
    await createTestTransaction(user1.id, { status: 'completed', created_at: today });
    await createTestTransaction(user1.id, { status: 'pending', created_at: today });
    await createTestTransaction(user2.id, { status: 'completed', created_at: today });
    await createTestTransaction(user1.id, { status: 'completed', created_at: yesterday });

    const input: TransactionSearchInput = {
      user_id: user1.id,
      status: 'completed',
      start_date: today,
      limit: 20,
      offset: 0
    };

    const results = await searchTransactions(input);

    expect(results).toHaveLength(1);
    expect(results[0].user_id).toEqual(user1.id);
    expect(results[0].status).toEqual('completed');
    expect(results[0].created_at.getDate()).toEqual(today.getDate());
  });

  it('should return empty array when no transactions match', async () => {
    const user = await createTestUser();
    await createTestTransaction(user.id, { status: 'completed' });

    const input: TransactionSearchInput = {
      status: 'refunded',
      limit: 20,
      offset: 0
    };

    const results = await searchTransactions(input);

    expect(results).toHaveLength(0);
  });

  it('should return transactions ordered by newest first', async () => {
    const user = await createTestUser();
    
    const firstDate = new Date('2024-01-01');
    const secondDate = new Date('2024-01-02');
    const thirdDate = new Date('2024-01-03');

    await createTestTransaction(user.id, { created_at: secondDate });
    await createTestTransaction(user.id, { created_at: firstDate });
    await createTestTransaction(user.id, { created_at: thirdDate });

    const input: TransactionSearchInput = {
      limit: 20,
      offset: 0
    };

    const results = await searchTransactions(input);

    expect(results).toHaveLength(3);
    expect(results[0].created_at.getTime()).toBeGreaterThan(results[1].created_at.getTime());
    expect(results[1].created_at.getTime()).toBeGreaterThan(results[2].created_at.getTime());
  });
});
