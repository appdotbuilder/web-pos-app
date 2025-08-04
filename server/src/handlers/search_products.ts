
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type ProductSearchInput, type Product } from '../schema';
import { eq, and, or, ilike, lte, SQL, isNotNull } from 'drizzle-orm';

export async function searchProducts(input: ProductSearchInput): Promise<Product[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Text search - search in name and barcode (case-insensitive)
    if (input.query) {
      const searchTerm = `%${input.query}%`;
      const searchConditions: SQL<unknown>[] = [
        ilike(productsTable.name, searchTerm)
      ];
      
      // Only add barcode search if barcode is not null
      searchConditions.push(
        and(
          isNotNull(productsTable.barcode),
          ilike(productsTable.barcode, searchTerm)
        )!
      );
      
      conditions.push(or(...searchConditions)!);
    }

    // Category filter
    if (input.category_id !== undefined) {
      conditions.push(eq(productsTable.category_id, input.category_id));
    }

    // Active status filter
    if (input.is_active !== undefined) {
      conditions.push(eq(productsTable.is_active, input.is_active));
    }

    // Low stock filter - products where stock is at or below minimum stock level
    if (input.low_stock === true) {
      conditions.push(lte(productsTable.stock_quantity, productsTable.min_stock));
    }

    // Build query with or without where clause
    const results = conditions.length > 0
      ? await db.select()
          .from(productsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .limit(input.limit)
          .offset(input.offset)
          .execute()
      : await db.select()
          .from(productsTable)
          .limit(input.limit)
          .offset(input.offset)
          .execute();

    // Convert numeric fields to numbers
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price),
      cost: parseFloat(product.cost)
    }));
  } catch (error) {
    console.error('Product search failed:', error);
    throw error;
  }
}
