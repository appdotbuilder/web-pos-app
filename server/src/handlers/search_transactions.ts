
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type TransactionSearchInput, type Transaction } from '../schema';
import { and, gte, lte, eq, desc, type SQL } from 'drizzle-orm';

export async function searchTransactions(input: TransactionSearchInput): Promise<Transaction[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (input.start_date) {
      conditions.push(gte(transactionsTable.created_at, input.start_date));
    }

    if (input.end_date) {
      conditions.push(lte(transactionsTable.created_at, input.end_date));
    }

    if (input.status) {
      conditions.push(eq(transactionsTable.status, input.status));
    }

    if (input.user_id) {
      conditions.push(eq(transactionsTable.user_id, input.user_id));
    }

    // Build the final query in one go
    const baseQuery = db.select().from(transactionsTable);
    
    const finalQuery = conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const results = await finalQuery
      .orderBy(desc(transactionsTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
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
    console.error('Transaction search failed:', error);
    throw error;
  }
}
