
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateCategoryInput = {
  name: 'Electronics',
  description: 'Electronic devices and accessories'
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category', async () => {
    const result = await createCategory(testInput);

    // Basic field validation
    expect(result.name).toEqual('Electronics');
    expect(result.description).toEqual('Electronic devices and accessories');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Electronics');
    expect(categories[0].description).toEqual('Electronic devices and accessories');
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should create category with null description', async () => {
    const inputWithNullDesc: CreateCategoryInput = {
      name: 'Books',
      description: null
    };

    const result = await createCategory(inputWithNullDesc);

    expect(result.name).toEqual('Books');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Books');
    expect(categories[0].description).toBeNull();
  });

  it('should allow duplicate category names', async () => {
    // Create first category
    const first = await createCategory(testInput);

    // Create second category with same name (should be allowed)
    const second = await createCategory(testInput);

    expect(first.id).not.toEqual(second.id);
    expect(first.name).toEqual(second.name);
    expect(first.description).toEqual(second.description);

    // Verify both exist in database
    const categories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(categories).toHaveLength(2);
    expect(categories.every(cat => cat.name === 'Electronics')).toBe(true);
  });
});
