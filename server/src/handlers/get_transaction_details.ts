
import { db } from '../db';
import { transactionsTable, transactionItemsTable } from '../db/schema';
import { type Transaction, type TransactionItem } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTransactionDetails(transactionId: number): Promise<Transaction & { items: TransactionItem[] }> {
  try {
    // Fetch transaction details
    const transactionResults = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    if (transactionResults.length === 0) {
      throw new Error(`Transaction with id ${transactionId} not found`);
    }

    const transactionData = transactionResults[0];

    // Fetch transaction items
    const itemResults = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, transactionId))
      .execute();

    // Convert numeric fields to numbers for transaction
    const transaction: Transaction = {
      ...transactionData,
      subtotal: parseFloat(transactionData.subtotal),
      tax_amount: parseFloat(transactionData.tax_amount),
      discount_amount: parseFloat(transactionData.discount_amount),
      total_amount: parseFloat(transactionData.total_amount),
      payment_amount: parseFloat(transactionData.payment_amount),
      change_amount: parseFloat(transactionData.change_amount)
    };

    // Convert numeric fields to numbers for items
    const items: TransactionItem[] = itemResults.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price),
      total_price: parseFloat(item.total_price)
    }));

    return {
      ...transaction,
      items
    };
  } catch (error) {
    console.error('Failed to get transaction details:', error);
    throw error;
  }
}
