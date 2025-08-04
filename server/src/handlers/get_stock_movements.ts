
import { db } from '../db';
import { stockMovementsTable } from '../db/schema';
import { type StockMovement } from '../schema';
import { eq } from 'drizzle-orm';

export async function getStockMovements(productId?: number): Promise<StockMovement[]> {
  try {
    const baseQuery = db.select().from(stockMovementsTable);
    
    const results = productId !== undefined 
      ? await baseQuery.where(eq(stockMovementsTable.product_id, productId)).execute()
      : await baseQuery.execute();

    return results.map(movement => ({
      ...movement,
      created_at: movement.created_at
    }));
  } catch (error) {
    console.error('Get stock movements failed:', error);
    throw error;
  }
}
