
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return all products', async () => {
    // Create a category first
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          description: 'First test product',
          price: '19.99',
          cost: '10.50',
          stock_quantity: 100,
          min_stock: 5,
          category_id: category[0].id,
          barcode: '1234567890',
          image_url: 'https://example.com/product1.jpg',
          is_active: true
        },
        {
          name: 'Product 2',
          description: 'Second test product',
          price: '29.99',
          cost: '15.00',
          stock_quantity: 50,
          min_stock: 10,
          category_id: null,
          barcode: null,
          image_url: null,
          is_active: false
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    
    // Verify first product
    const product1 = result.find(p => p.name === 'Product 1');
    expect(product1).toBeDefined();
    expect(product1!.name).toBe('Product 1');
    expect(product1!.description).toBe('First test product');
    expect(product1!.price).toBe(19.99);
    expect(typeof product1!.price).toBe('number');
    expect(product1!.cost).toBe(10.50);
    expect(typeof product1!.cost).toBe('number');
    expect(product1!.stock_quantity).toBe(100);
    expect(product1!.min_stock).toBe(5);
    expect(product1!.category_id).toBe(category[0].id);
    expect(product1!.barcode).toBe('1234567890');
    expect(product1!.image_url).toBe('https://example.com/product1.jpg');
    expect(product1!.is_active).toBe(true);
    expect(product1!.id).toBeDefined();
    expect(product1!.created_at).toBeInstanceOf(Date);
    expect(product1!.updated_at).toBeInstanceOf(Date);

    // Verify second product
    const product2 = result.find(p => p.name === 'Product 2');
    expect(product2).toBeDefined();
    expect(product2!.name).toBe('Product 2');
    expect(product2!.description).toBe('Second test product');
    expect(product2!.price).toBe(29.99);
    expect(typeof product2!.price).toBe('number');
    expect(product2!.cost).toBe(15.00);
    expect(typeof product2!.cost).toBe('number');
    expect(product2!.stock_quantity).toBe(50);
    expect(product2!.min_stock).toBe(10);
    expect(product2!.category_id).toBeNull();
    expect(product2!.barcode).toBeNull();
    expect(product2!.image_url).toBeNull();
    expect(product2!.is_active).toBe(false);
  });

  it('should handle products with different numeric values correctly', async () => {
    // Create products with edge case numeric values
    await db.insert(productsTable)
      .values([
        {
          name: 'Free Product',
          description: 'Product with zero price',
          price: '0.00',
          cost: '0.00',
          stock_quantity: 1,
          min_stock: 0
        },
        {
          name: 'Expensive Product',
          description: 'Product with high precision price',
          price: '999.99',
          cost: '500.50',
          stock_quantity: 5,
          min_stock: 1
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);

    const freeProduct = result.find(p => p.name === 'Free Product');
    expect(freeProduct!.price).toBe(0);
    expect(freeProduct!.cost).toBe(0);
    expect(typeof freeProduct!.price).toBe('number');
    expect(typeof freeProduct!.cost).toBe('number');

    const expensiveProduct = result.find(p => p.name === 'Expensive Product');
    expect(expensiveProduct!.price).toBe(999.99);
    expect(expensiveProduct!.cost).toBe(500.50);
    expect(typeof expensiveProduct!.price).toBe('number');
    expect(typeof expensiveProduct!.cost).toBe('number');
  });
});
