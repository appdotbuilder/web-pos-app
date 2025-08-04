
import { db } from '../db';
import { productsTable, categoriesTable, stockMovementsTable } from '../db/schema';
import { type CreateProductInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export async function createProduct(input: CreateProductInput): Promise<Product> {
  try {
    // Validate category exists if provided
    if (input.category_id !== null) {
      const category = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();
      
      if (category.length === 0) {
        throw new Error(`Category with id ${input.category_id} not found`);
      }
    }

    // Insert product record
    const result = await db.insert(productsTable)
      .values({
        name: input.name,
        description: input.description,
        price: input.price.toString(),
        cost: input.cost.toString(),
        stock_quantity: input.stock_quantity,
        min_stock: input.min_stock,
        category_id: input.category_id,
        barcode: input.barcode,
        image_url: input.image_url
      })
      .returning()
      .execute();

    const product = result[0];

    // Create initial stock movement if there's initial stock
    if (input.stock_quantity > 0) {
      await db.insert(stockMovementsTable)
        .values({
          product_id: product.id,
          type: 'in',
          quantity: input.stock_quantity,
          reference_type: 'initial_stock',
          reference_id: product.id,
          notes: 'Initial stock for new product',
          user_id: 1 // TODO: Get from context/session in real implementation
        })
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...product,
      price: parseFloat(product.price),
      cost: parseFloat(product.cost)
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
}
