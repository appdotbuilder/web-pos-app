
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { getSalesReport } from '../handlers/get_sales_report';

describe('getSalesReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty report for no transactions', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = await getSalesReport(startDate, endDate);

    expect(result.total_sales).toEqual(0);
    expect(result.total_transactions).toEqual(0);
    expect(result.average_transaction).toEqual(0);
    expect(result.top_products).toHaveLength(0);
    expect(result.daily_sales).toHaveLength(0);
  });

  it('should generate comprehensive sales report', async () => {
    // Create test data
    const user = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash',
      full_name: 'Test User',
      role: 'kasir'
    }).returning().execute();

    const category = await db.insert(categoriesTable).values({
      name: 'Electronics',
      description: 'Test category'
    }).returning().execute();

    const products = await db.insert(productsTable).values([
      {
        name: 'Product A',
        description: 'Test product A',
        price: '100.00',
        cost: '50.00',
        stock_quantity: 100,
        category_id: category[0].id
      },
      {
        name: 'Product B',
        description: 'Test product B',
        price: '200.00',
        cost: '100.00',
        stock_quantity: 50,
        category_id: category[0].id
      }
    ]).returning().execute();

    // Create transactions on different dates
    const transaction1 = await db.insert(transactionsTable).values({
      transaction_number: 'TXN001',
      user_id: user[0].id,
      subtotal: '300.00',
      tax_amount: '30.00',
      total_amount: '330.00',
      payment_method: 'cash',
      payment_amount: '330.00',
      status: 'completed',
      created_at: new Date('2024-01-15T10:00:00Z')
    }).returning().execute();

    const transaction2 = await db.insert(transactionsTable).values({
      transaction_number: 'TXN002',
      user_id: user[0].id,
      subtotal: '400.00',
      tax_amount: '40.00',
      total_amount: '440.00',
      payment_method: 'card',
      payment_amount: '440.00',
      status: 'completed',
      created_at: new Date('2024-01-20T14:00:00Z')
    }).returning().execute();

    // Create transaction items
    await db.insert(transactionItemsTable).values([
      {
        transaction_id: transaction1[0].id,
        product_id: products[0].id,
        quantity: 2,
        unit_price: '100.00',
        total_price: '200.00'
      },
      {
        transaction_id: transaction1[0].id,
        product_id: products[1].id,
        quantity: 1,
        unit_price: '100.00',
        total_price: '100.00'
      },
      {
        transaction_id: transaction2[0].id,
        product_id: products[1].id,
        quantity: 2,
        unit_price: '200.00',
        total_price: '400.00'
      }
    ]).execute();

    // Generate report
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    const result = await getSalesReport(startDate, endDate);

    // Verify totals
    expect(result.total_sales).toEqual(770); // 330 + 440
    expect(result.total_transactions).toEqual(2);
    expect(result.average_transaction).toEqual(385); // 770 / 2

    // Verify top products (ordered by revenue)
    expect(result.top_products).toHaveLength(2);
    expect(result.top_products[0].product_name).toEqual('Product B');
    expect(result.top_products[0].revenue).toEqual(500); // 100 + 400
    expect(result.top_products[0].quantity_sold).toEqual(3); // 1 + 2
    expect(result.top_products[1].product_name).toEqual('Product A');
    expect(result.top_products[1].revenue).toEqual(200);
    expect(result.top_products[1].quantity_sold).toEqual(2);

    // Verify daily sales
    expect(result.daily_sales).toHaveLength(2);
    expect(result.daily_sales[0].date).toEqual('2024-01-15');
    expect(result.daily_sales[0].sales).toEqual(330);
    expect(result.daily_sales[0].transactions).toEqual(1);
    expect(result.daily_sales[1].date).toEqual('2024-01-20');
    expect(result.daily_sales[1].sales).toEqual(440);
    expect(result.daily_sales[1].transactions).toEqual(1);
  });

  it('should filter by date range correctly', async () => {
    // Create test data
    const user = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash',
      full_name: 'Test User',
      role: 'kasir'
    }).returning().execute();

    const product = await db.insert(productsTable).values({
      name: 'Test Product',
      description: 'Test product',
      price: '100.00',
      cost: '50.00',
      stock_quantity: 100
    }).returning().execute();

    // Create transactions - one inside range, one outside
    const insideRangeTransaction = await db.insert(transactionsTable).values({
      transaction_number: 'TXN001',
      user_id: user[0].id,
      subtotal: '100.00',
      tax_amount: '10.00',
      total_amount: '110.00',
      payment_method: 'cash',
      payment_amount: '110.00',
      status: 'completed',
      created_at: new Date('2024-01-15T10:00:00Z')
    }).returning().execute();

    await db.insert(transactionsTable).values({
      transaction_number: 'TXN002',
      user_id: user[0].id,
      subtotal: '200.00',
      tax_amount: '20.00',
      total_amount: '220.00',
      payment_method: 'cash',
      payment_amount: '220.00',
      status: 'completed',
      created_at: new Date('2024-02-15T10:00:00Z') // Outside range
    }).execute();

    await db.insert(transactionItemsTable).values({
      transaction_id: insideRangeTransaction[0].id,
      product_id: product[0].id,
      quantity: 1,
      unit_price: '100.00',
      total_price: '100.00'
    }).execute();

    // Generate report for January only
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    const result = await getSalesReport(startDate, endDate);

    // Should only include January transaction
    expect(result.total_sales).toEqual(110);
    expect(result.total_transactions).toEqual(1);
    expect(result.daily_sales).toHaveLength(1);
    expect(result.daily_sales[0].date).toEqual('2024-01-15');
  });

  it('should exclude non-completed transactions', async () => {
    // Create test data
    const user = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash',
      full_name: 'Test User',
      role: 'kasir'
    }).returning().execute();

    // Create transactions with different statuses
    await db.insert(transactionsTable).values([
      {
        transaction_number: 'TXN001',
        user_id: user[0].id,
        subtotal: '100.00',
        tax_amount: '10.00',
        total_amount: '110.00',
        payment_method: 'cash',
        payment_amount: '110.00',
        status: 'completed', // Should be included
        created_at: new Date('2024-01-15T10:00:00Z')
      },
      {
        transaction_number: 'TXN002',
        user_id: user[0].id,
        subtotal: '200.00',
        tax_amount: '20.00',
        total_amount: '220.00',
        payment_method: 'cash',
        payment_amount: '220.00',
        status: 'pending', // Should be excluded
        created_at: new Date('2024-01-16T10:00:00Z')
      },
      {
        transaction_number: 'TXN003',
        user_id: user[0].id,
        subtotal: '300.00',
        tax_amount: '30.00',
        total_amount: '330.00',
        payment_method: 'cash',
        payment_amount: '330.00',
        status: 'cancelled', // Should be excluded
        created_at: new Date('2024-01-17T10:00:00Z')
      }
    ]).execute();

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    const result = await getSalesReport(startDate, endDate);

    // Should only include completed transaction
    expect(result.total_sales).toEqual(110);
    expect(result.total_transactions).toEqual(1);
    expect(result.daily_sales).toHaveLength(1);
    expect(result.daily_sales[0].sales).toEqual(110);
  });
});
