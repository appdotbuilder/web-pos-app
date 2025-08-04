
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const updateProduct = async (input: UpdateProductInput): Promise<Product> => {
  try {
    // First, check if product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    // Prepare update data - only include fields that are provided
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.price !== undefined) {
      updateData.price = input.price.toString(); // Convert number to string for numeric column
    }
    if (input.cost !== undefined) {
      updateData.cost = input.cost.toString(); // Convert number to string for numeric column
    }
    if (input.stock_quantity !== undefined) {
      updateData.stock_quantity = input.stock_quantity; // Integer column - no conversion needed
    }
    if (input.min_stock !== undefined) {
      updateData.min_stock = input.min_stock; // Integer column - no conversion needed
    }
    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }
    if (input.barcode !== undefined) {
      updateData.barcode = input.barcode;
    }
    if (input.image_url !== undefined) {
      updateData.image_url = input.image_url;
    }
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update product record
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price), // Convert string back to number
      cost: parseFloat(product.cost) // Convert string back to number
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
};
