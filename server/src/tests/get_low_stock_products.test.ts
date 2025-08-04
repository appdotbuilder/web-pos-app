
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { getLowStockProducts } from '../handlers/get_low_stock_products';

describe('getLowStockProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return products with stock below minimum threshold', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    // Create test products - one with low stock, one with adequate stock
    await db.insert(productsTable)
      .values([
        {
          name: 'Low Stock Product',
          description: 'Product with low stock',
          price: '10.99',
          cost: '5.50',
          stock_quantity: 3,
          min_stock: 5,
          category_id: categoryResult[0].id,
          barcode: 'LOW001',
          image_url: null,
          is_active: true
        },
        {
          name: 'Adequate Stock Product',
          description: 'Product with adequate stock',
          price: '15.99',
          cost: '8.00',
          stock_quantity: 10,
          min_stock: 5,
          category_id: categoryResult[0].id,
          barcode: 'ADQ001',
          image_url: null,
          is_active: true
        }
      ])
      .execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Low Stock Product');
    expect(result[0].stock_quantity).toEqual(3);
    expect(result[0].min_stock).toEqual(5);
    expect(typeof result[0].price).toBe('number');
    expect(result[0].price).toEqual(10.99);
    expect(typeof result[0].cost).toBe('number');
    expect(result[0].cost).toEqual(5.50);
    expect(result[0].is_active).toBe(true);
  });

  it('should return products where stock equals minimum threshold', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    // Create product with stock exactly at minimum
    await db.insert(productsTable)
      .values({
        name: 'Exact Min Stock Product',
        description: 'Product with stock at minimum',
        price: '12.50',
        cost: '6.00',
        stock_quantity: 5,
        min_stock: 5,
        category_id: categoryResult[0].id,
        barcode: 'MIN001',
        image_url: null,
        is_active: true
      })
      .execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Exact Min Stock Product');
    expect(result[0].stock_quantity).toEqual(5);
    expect(result[0].min_stock).toEqual(5);
  });

  it('should not return inactive products', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    // Create inactive product with low stock
    await db.insert(productsTable)
      .values({
        name: 'Inactive Low Stock Product',
        description: 'Inactive product with low stock',
        price: '20.00',
        cost: '10.00',
        stock_quantity: 2,
        min_stock: 10,
        category_id: categoryResult[0].id,
        barcode: 'INACT001',
        image_url: null,
        is_active: false
      })
      .execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no products have low stock', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    // Create product with adequate stock
    await db.insert(productsTable)
      .values({
        name: 'High Stock Product',
        description: 'Product with high stock',
        price: '25.00',
        cost: '12.50',
        stock_quantity: 50,
        min_stock: 10,
        category_id: categoryResult[0].id,
        barcode: 'HIGH001',
        image_url: null,
        is_active: true
      })
      .execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(0);
  });

  it('should handle products with zero stock', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    // Create product with zero stock
    await db.insert(productsTable)
      .values({
        name: 'Zero Stock Product',
        description: 'Product with zero stock',
        price: '30.00',
        cost: '15.00',
        stock_quantity: 0,
        min_stock: 5,
        category_id: categoryResult[0].id,
        barcode: 'ZERO001',
        image_url: null,
        is_active: true
      })
      .execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Zero Stock Product');
    expect(result[0].stock_quantity).toEqual(0);
    expect(result[0].min_stock).toEqual(5);
  });
});
