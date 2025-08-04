
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for empty database', async () => {
    const stats = await getDashboardStats();

    expect(stats.today_sales).toEqual(0);
    expect(stats.today_transactions).toEqual(0);
    expect(stats.low_stock_products).toEqual(0);
    expect(stats.total_products).toEqual(0);
    expect(stats.active_users).toEqual(0);
  });

  it('should calculate today sales and transactions correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User',
        role: 'kasir',
        is_active: true
      })
      .returning()
      .execute();

    // Create test product
    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Test description',
        price: '50.00',
        cost: '30.00',
        stock_quantity: 100,
        min_stock: 10,
        is_active: true
      })
      .returning()
      .execute();

    // Create today's completed transaction
    const transaction = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN001',
        user_id: user[0].id,
        subtotal: '100.00',
        tax_amount: '10.00',
        discount_amount: '5.00',
        total_amount: '105.00',
        payment_method: 'cash',
        payment_amount: '105.00',
        change_amount: '0.00',
        status: 'completed'
      })
      .returning()
      .execute();

    // Create second completed transaction
    await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN002',  
        user_id: user[0].id,
        subtotal: '75.00',
        tax_amount: '7.50',
        discount_amount: '0.00',
        total_amount: '82.50',
        payment_method: 'card',
        payment_amount: '82.50',
        change_amount: '0.00',
        status: 'completed'
      })
      .execute();

    // Create pending transaction (should not be counted)
    await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN003',
        user_id: user[0].id,
        subtotal: '25.00',
        tax_amount: '2.50',
        discount_amount: '0.00',
        total_amount: '27.50',
        payment_method: 'cash',
        payment_amount: '27.50',
        change_amount: '0.00',
        status: 'pending'
      })
      .execute();

    const stats = await getDashboardStats();

    expect(stats.today_sales).toEqual(187.50); // 105.00 + 82.50
    expect(stats.today_transactions).toEqual(2); // Only completed transactions
    expect(stats.total_products).toEqual(1);
    expect(stats.active_users).toEqual(1);
  });

  it('should count low stock products correctly', async () => {
    // Create products with different stock levels
    await db.insert(productsTable)
      .values([
        {
          name: 'Low Stock Product 1',
          description: 'Test',
          price: '10.00',
          cost: '5.00',
          stock_quantity: 3, // Below min_stock (5)
          min_stock: 5,
          is_active: true
        },
        {
          name: 'Low Stock Product 2',
          description: 'Test',
          price: '15.00',
          cost: '8.00',
          stock_quantity: 2, // Below min_stock (10)
          min_stock: 10,
          is_active: true
        },
        {
          name: 'Normal Stock Product',
          description: 'Test',
          price: '20.00',
          cost: '12.00',
          stock_quantity: 50, // Above min_stock (5)
          min_stock: 5,
          is_active: true
        },
        {
          name: 'Inactive Low Stock',
          description: 'Test',
          price: '25.00',
          cost: '15.00',
          stock_quantity: 1, // Below min_stock but inactive
          min_stock: 5,
          is_active: false
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.low_stock_products).toEqual(2); // Only active products with low stock
    expect(stats.total_products).toEqual(3); // Only active products
  });

  it('should handle past transactions correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User',
        role: 'kasir',
        is_active: true
      })
      .returning()
      .execute();

    // Create yesterday's transaction (should not be counted in today's stats)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN_YESTERDAY',
        user_id: user[0].id,
        subtotal: '200.00',
        tax_amount: '20.00',
        discount_amount: '0.00',
        total_amount: '220.00',
        payment_method: 'cash',
        payment_amount: '220.00',
        change_amount: '0.00',
        status: 'completed',
        created_at: yesterday
      })
      .execute();

    const stats = await getDashboardStats();

    expect(stats.today_sales).toEqual(0); // No today transactions
    expect(stats.today_transactions).toEqual(0);
    expect(stats.active_users).toEqual(1);
  });

  it('should count active and inactive users correctly', async () => {
    // Create mix of active and inactive users
    await db.insert(usersTable)
      .values([
        {
          username: 'activeuser1',
          email: 'active1@example.com',
          password_hash: 'hash',
          full_name: 'Active User 1',
          role: 'kasir',
          is_active: true
        },
        {
          username: 'activeuser2',
          email: 'active2@example.com',
          password_hash: 'hash',
          full_name: 'Active User 2',
          role: 'admin',
          is_active: true
        },
        {
          username: 'inactiveuser',
          email: 'inactive@example.com',
          password_hash: 'hash',
          full_name: 'Inactive User',
          role: 'manajer',
          is_active: false
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.active_users).toEqual(2); // Only active users counted
  });
});
