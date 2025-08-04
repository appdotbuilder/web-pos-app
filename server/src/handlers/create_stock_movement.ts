
import { db } from '../db';
import { stockMovementsTable, productsTable } from '../db/schema';
import { type CreateStockMovementInput, type StockMovement } from '../schema';
import { eq } from 'drizzle-orm';

export const createStockMovement = async (input: CreateStockMovementInput, userId: number): Promise<StockMovement> => {
  try {
    // Verify product exists
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (products.length === 0) {
      throw new Error('Product not found');
    }

    const product = products[0];

    // Calculate new stock quantity based on movement type
    let newStockQuantity: number;
    if (input.type === 'in') {
      newStockQuantity = product.stock_quantity + Math.abs(input.quantity);
    } else if (input.type === 'out') {
      newStockQuantity = product.stock_quantity - Math.abs(input.quantity);
    } else { // adjustment
      newStockQuantity = input.quantity;
    }

    // Ensure stock doesn't go negative
    if (newStockQuantity < 0) {
      throw new Error('Insufficient stock quantity');
    }

    // Update product stock quantity
    await db.update(productsTable)
      .set({ 
        stock_quantity: newStockQuantity,
        updated_at: new Date()
      })
      .where(eq(productsTable.id, input.product_id))
      .execute();

    // Create stock movement record
    const result = await db.insert(stockMovementsTable)
      .values({
        product_id: input.product_id,
        type: input.type,
        quantity: input.quantity,
        reference_type: input.reference_type,
        reference_id: input.reference_id,
        notes: input.notes,
        user_id: userId
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Stock movement creation failed:', error);
    throw error;
  }
};
