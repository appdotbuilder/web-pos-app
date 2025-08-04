
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();
    expect(result).toEqual([]);
  });

  it('should return all categories', async () => {
    // Create test categories
    await db.insert(categoriesTable)
      .values([
        { name: 'Electronics', description: 'Electronic devices' },
        { name: 'Clothing', description: 'Apparel and accessories' },
        { name: 'Books', description: null }
      ])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(3);
    
    // Verify first category
    const electronics = result.find(cat => cat.name === 'Electronics');
    expect(electronics).toBeDefined();
    expect(electronics!.description).toEqual('Electronic devices');
    expect(electronics!.id).toBeDefined();
    expect(electronics!.created_at).toBeInstanceOf(Date);

    // Verify second category
    const clothing = result.find(cat => cat.name === 'Clothing');
    expect(clothing).toBeDefined();
    expect(clothing!.description).toEqual('Apparel and accessories');

    // Verify category with null description
    const books = result.find(cat => cat.name === 'Books');
    expect(books).toBeDefined();
    expect(books!.description).toBeNull();
  });

  it('should return categories in creation order', async () => {
    // Create categories in specific order
    const category1 = await db.insert(categoriesTable)
      .values({ name: 'First Category', description: 'First' })
      .returning()
      .execute();

    const category2 = await db.insert(categoriesTable)
      .values({ name: 'Second Category', description: 'Second' })
      .returning()
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(2);
    expect(result[0].id).toEqual(category1[0].id);
    expect(result[1].id).toEqual(category2[0].id);
    expect(result[0].name).toEqual('First Category');
    expect(result[1].name).toEqual('Second Category');
  });
});
