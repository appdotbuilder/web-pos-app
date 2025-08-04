
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { lte, and, eq } from 'drizzle-orm';

export async function getLowStockProducts(): Promise<Product[]> {
  try {
    // Query products where stock_quantity <= min_stock and is_active = true
    const results = await db.select()
      .from(productsTable)
      .where(
        and(
          lte(productsTable.stock_quantity, productsTable.min_stock),
          eq(productsTable.is_active, true)
        )
      )
      .execute();

    // Convert numeric fields from strings to numbers
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price),
      cost: parseFloat(product.cost)
    }));
  } catch (error) {
    console.error('Failed to fetch low stock products:', error);
    throw error;
  }
}
