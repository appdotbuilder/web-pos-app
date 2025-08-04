
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';

export const getProducts = async (): Promise<Product[]> => {
  try {
    const results = await db.select()
      .from(productsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price),
      cost: parseFloat(product.cost)
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
};
