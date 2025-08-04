
import { db } from '../db';
import { transactionsTable, transactionItemsTable, productsTable, stockMovementsTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  try {
    // Generate unique transaction number
    const timestamp = Date.now();
    const transactionNumber = `TXN-${timestamp}`;

    // Calculate totals
    const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = subtotal * (input.tax_rate || 0);
    const totalAmount = subtotal + taxAmount - input.discount_amount;
    const changeAmount = Math.max(0, input.payment_amount - totalAmount);

    // Validate products exist and have sufficient stock
    for (const item of input.items) {
      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, item.product_id))
        .execute();

      if (products.length === 0) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }

      const product = products[0];
      if (product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`);
      }
    }

    // Create transaction record
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: transactionNumber,
        user_id: 1, // TODO: Should come from authenticated user context
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        subtotal: subtotal.toString(),
        tax_amount: taxAmount.toString(),
        discount_amount: input.discount_amount.toString(),
        total_amount: totalAmount.toString(),
        payment_method: input.payment_method,
        payment_amount: input.payment_amount.toString(),
        change_amount: changeAmount.toString(),
        status: 'completed',
        notes: input.notes
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Create transaction items
    for (const item of input.items) {
      const itemTotal = item.quantity * item.unit_price;

      await db.insert(transactionItemsTable)
        .values({
          transaction_id: transaction.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price.toString(),
          total_price: itemTotal.toString()
        })
        .execute();

      // Update product stock
      await db.update(productsTable)
        .set({
          stock_quantity: sql`stock_quantity - ${item.quantity}`,
          updated_at: new Date()
        })
        .where(eq(productsTable.id, item.product_id))
        .execute();

      // Create stock movement record
      await db.insert(stockMovementsTable)
        .values({
          product_id: item.product_id,
          type: 'out',
          quantity: -item.quantity, // Negative for outgoing stock
          reference_type: 'transaction',
          reference_id: transaction.id,
          notes: `Sale transaction ${transactionNumber}`,
          user_id: 1 // TODO: Should come from authenticated user context
        })
        .execute();
    }

    // Return transaction with numeric conversions
    return {
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      tax_amount: parseFloat(transaction.tax_amount),
      discount_amount: parseFloat(transaction.discount_amount),
      total_amount: parseFloat(transaction.total_amount),
      payment_amount: parseFloat(transaction.payment_amount),
      change_amount: parseFloat(transaction.change_amount)
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
}
