
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type ProductSearchInput } from '../schema';
import { searchProducts } from '../handlers/search_products';

describe('searchProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all products when no filters applied', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({ name: 'Electronics', description: 'Electronic items' })
      .returning()
      .execute();

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Laptop',
          description: 'Gaming laptop',
          price: '999.99',
          cost: '700.00',
          stock_quantity: 10,
          min_stock: 5,
          category_id: categoryResult[0].id,
          barcode: '123456789',
          is_active: true
        },
        {
          name: 'Mouse',
          description: 'Wireless mouse',
          price: '29.99',
          cost: '15.00',
          stock_quantity: 50,
          min_stock: 10,
          category_id: categoryResult[0].id,
          barcode: '987654321',
          is_active: true
        }
      ])
      .execute();

    const input: ProductSearchInput = {
      limit: 20,
      offset: 0
    };

    const result = await searchProducts(input);

    expect(result).toHaveLength(2);
    expect(typeof result[0].price).toBe('number');
    expect(typeof result[0].cost).toBe('number');
    expect(result[0].price).toBe(999.99);
    expect(result[1].price).toBe(29.99);
  });

  it('should search by product name', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({ name: 'Electronics', description: 'Electronic items' })
      .returning()
      .execute();

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Laptop Computer',
          description: 'Gaming laptop',
          price: '999.99',
          cost: '700.00',
          stock_quantity: 10,
          min_stock: 5,
          category_id: categoryResult[0].id,
          barcode: '123456789',
          is_active: true
        },
        {
          name: 'Wireless Mouse',
          description: 'Computer mouse',
          price: '29.99',
          cost: '15.00',
          stock_quantity: 50,
          min_stock: 10,
          category_id: categoryResult[0].id,
          barcode: '987654321',
          is_active: true
        }
      ])
      .execute();

    const input: ProductSearchInput = {
      query: 'Laptop',
      limit: 20,
      offset: 0
    };

    const result = await searchProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Laptop Computer');
  });

  it('should search by barcode', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({ name: 'Electronics', description: 'Electronic items' })
      .returning()
      .execute();

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Laptop',
          description: 'Gaming laptop',
          price: '999.99',
          cost: '700.00',
          stock_quantity: 10,
          min_stock: 5,
          category_id: categoryResult[0].id,
          barcode: '123456789',
          is_active: true
        },
        {
          name: 'Mouse',
          description: 'Wireless mouse',
          price: '29.99',
          cost: '15.00',
          stock_quantity: 50,
          min_stock: 10,
          category_id: categoryResult[0].id,
          barcode: '987654321',
          is_active: true
        }
      ])
      .execute();

    const input: ProductSearchInput = {
      query: '123456789',
      limit: 20,
      offset: 0
    };

    const result = await searchProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].barcode).toBe('123456789');
    expect(result[0].name).toBe('Laptop');
  });

  it('should filter by category', async () => {
    // Create test categories
    const electronicsCategory = await db.insert(categoriesTable)
      .values({ name: 'Electronics', description: 'Electronic items' })
      .returning()
      .execute();

    const furnitureCategory = await db.insert(categoriesTable)
      .values({ name: 'Furniture', description: 'Furniture items' })
      .returning()
      .execute();

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Laptop',
          description: 'Gaming laptop',
          price: '999.99',
          cost: '700.00',
          stock_quantity: 10,
          min_stock: 5,
          category_id: electronicsCategory[0].id,
          barcode: '123456789',
          is_active: true
        },
        {
          name: 'Desk Chair',
          description: 'Office chair',
          price: '199.99',
          cost: '100.00',
          stock_quantity: 5,
          min_stock: 2,
          category_id: furnitureCategory[0].id,
          barcode: '555666777',
          is_active: true
        }
      ])
      .execute();

    const input: ProductSearchInput = {
      category_id: electronicsCategory[0].id,
      limit: 20,
      offset: 0
    };

    const result = await searchProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Laptop');
    expect(result[0].category_id).toBe(electronicsCategory[0].id);
  });

  it('should filter by active status', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({ name: 'Electronics', description: 'Electronic items' })
      .returning()
      .execute();

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Active Product',
          description: 'This product is active',
          price: '99.99',
          cost: '50.00',
          stock_quantity: 10,
          min_stock: 5,
          category_id: categoryResult[0].id,
          barcode: '111222333',
          is_active: true
        },
        {
          name: 'Inactive Product',
          description: 'This product is inactive',
          price: '199.99',
          cost: '100.00',
          stock_quantity: 5,
          min_stock: 2,
          category_id: categoryResult[0].id,
          barcode: '444555666',
          is_active: false
        }
      ])
      .execute();

    const input: ProductSearchInput = {
      is_active: false,
      limit: 20,
      offset: 0
    };

    const result = await searchProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Inactive Product');
    expect(result[0].is_active).toBe(false);
  });

  it('should filter by low stock status', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({ name: 'Electronics', description: 'Electronic items' })
      .returning()
      .execute();

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Low Stock Product',
          description: 'Product with low stock',
          price: '99.99',
          cost: '50.00',
          stock_quantity: 3, // Below min_stock of 5
          min_stock: 5,
          category_id: categoryResult[0].id,
          barcode: '111222333',
          is_active: true
        },
        {
          name: 'Normal Stock Product',
          description: 'Product with normal stock',
          price: '199.99',
          cost: '100.00',
          stock_quantity: 20, // Above min_stock of 10
          min_stock: 10,
          category_id: categoryResult[0].id,
          barcode: '444555666',
          is_active: true
        }
      ])
      .execute();

    const input: ProductSearchInput = {
      low_stock: true,
      limit: 20,
      offset: 0
    };

    const result = await searchProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Low Stock Product');
    expect(result[0].stock_quantity).toBe(3);
    expect(result[0].min_stock).toBe(5);
  });

  it('should apply pagination correctly', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({ name: 'Electronics', description: 'Electronic items' })
      .returning()
      .execute();

    // Create multiple test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          description: 'First product',
          price: '10.00',
          cost: '5.00',
          stock_quantity: 10,
          min_stock: 5,
          category_id: categoryResult[0].id,
          barcode: '111',
          is_active: true
        },
        {
          name: 'Product 2',
          description: 'Second product',
          price: '20.00',
          cost: '10.00',
          stock_quantity: 10,
          min_stock: 5,
          category_id: categoryResult[0].id,
          barcode: '222',
          is_active: true
        },
        {
          name: 'Product 3',
          description: 'Third product',
          price: '30.00',
          cost: '15.00',
          stock_quantity: 10,
          min_stock: 5,
          category_id: categoryResult[0].id,
          barcode: '333',
          is_active: true
        }
      ])
      .execute();

    // Test first page
    const firstPageInput: ProductSearchInput = {
      limit: 2,
      offset: 0
    };

    const firstPageResult = await searchProducts(firstPageInput);
    expect(firstPageResult).toHaveLength(2);

    // Test second page
    const secondPageInput: ProductSearchInput = {
      limit: 2,
      offset: 2
    };

    const secondPageResult = await searchProducts(secondPageInput);
    expect(secondPageResult).toHaveLength(1);
  });

  it('should combine multiple filters', async () => {
    // Create test categories
    const electronicsCategory = await db.insert(categoriesTable)
      .values({ name: 'Electronics', description: 'Electronic items' })
      .returning()
      .execute();

    const furnitureCategory = await db.insert(categoriesTable)
      .values({ name: 'Furniture', description: 'Furniture items' })
      .returning()
      .execute();

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Gaming Laptop',
          description: 'High-end gaming laptop',
          price: '999.99',
          cost: '700.00',
          stock_quantity: 10,
          min_stock: 5,
          category_id: electronicsCategory[0].id,
          barcode: '123456789',
          is_active: true
        },
        {
          name: 'Gaming Chair',
          description: 'Comfortable gaming chair',
          price: '299.99',
          cost: '150.00',
          stock_quantity: 5,
          min_stock: 2,
          category_id: furnitureCategory[0].id,
          barcode: '987654321',
          is_active: true
        },
        {
          name: 'Gaming Mouse',
          description: 'RGB gaming mouse',
          price: '79.99',
          cost: '40.00',
          stock_quantity: 1, // Low stock
          min_stock: 5,
          category_id: electronicsCategory[0].id,
          barcode: '555666777',
          is_active: false // Inactive
        }
      ])
      .execute();

    // Search for gaming products in electronics category that are active
    const input: ProductSearchInput = {
      query: 'Gaming',
      category_id: electronicsCategory[0].id,
      is_active: true,
      limit: 20,
      offset: 0
    };

    const result = await searchProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Gaming Laptop');
    expect(result[0].category_id).toBe(electronicsCategory[0].id);
    expect(result[0].is_active).toBe(true);
  });
});
