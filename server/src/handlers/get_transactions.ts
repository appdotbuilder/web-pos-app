
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { desc } from 'drizzle-orm';

export async function getTransactions(): Promise<Transaction[]> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.created_at))
      .limit(20)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      tax_amount: parseFloat(transaction.tax_amount),
      discount_amount: parseFloat(transaction.discount_amount),
      total_amount: parseFloat(transaction.total_amount),
      payment_amount: parseFloat(transaction.payment_amount),
      change_amount: parseFloat(transaction.change_amount)
    }));
  } catch (error) {
    console.error('Get transactions failed:', error);
    throw error;
  }
}
