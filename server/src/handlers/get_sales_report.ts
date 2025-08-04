
import { db } from '../db';
import { transactionsTable, transactionItemsTable, productsTable } from '../db/schema';
import { type SalesReport } from '../schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

export async function getSalesReport(startDate: Date, endDate: Date): Promise<SalesReport> {
  try {
    // Get total sales and transaction count for the period
    const salesSummary = await db.select({
      total_sales: sql<string>`COALESCE(SUM(${transactionsTable.total_amount}), 0)`,
      total_transactions: sql<string>`COUNT(*)`,
    })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.status, 'completed'),
        gte(transactionsTable.created_at, startDate),
        lte(transactionsTable.created_at, endDate)
      )
    )
    .execute();

    const totalSales = parseFloat(salesSummary[0]?.total_sales || '0');
    const totalTransactions = parseInt(salesSummary[0]?.total_transactions || '0');
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Get top products with sales data
    const topProductsData = await db.select({
      product_id: transactionItemsTable.product_id,
      product_name: productsTable.name,
      quantity_sold: sql<string>`SUM(${transactionItemsTable.quantity})`,
      revenue: sql<string>`SUM(${transactionItemsTable.total_price})`,
    })
    .from(transactionItemsTable)
    .innerJoin(transactionsTable, eq(transactionItemsTable.transaction_id, transactionsTable.id))
    .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
    .where(
      and(
        eq(transactionsTable.status, 'completed'),
        gte(transactionsTable.created_at, startDate),
        lte(transactionsTable.created_at, endDate)
      )
    )
    .groupBy(transactionItemsTable.product_id, productsTable.name)
    .orderBy(desc(sql`SUM(${transactionItemsTable.total_price})`))
    .limit(10)
    .execute();

    const topProducts = topProductsData.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity_sold: parseInt(item.quantity_sold),
      revenue: parseFloat(item.revenue)
    }));

    // Get daily sales breakdown
    const dailySalesData = await db.select({
      date: sql<string>`DATE(${transactionsTable.created_at})`,
      sales: sql<string>`COALESCE(SUM(${transactionsTable.total_amount}), 0)`,
      transactions: sql<string>`COUNT(*)`,
    })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.status, 'completed'),
        gte(transactionsTable.created_at, startDate),
        lte(transactionsTable.created_at, endDate)
      )
    )
    .groupBy(sql`DATE(${transactionsTable.created_at})`)
    .orderBy(sql`DATE(${transactionsTable.created_at})`)
    .execute();

    const dailySales = dailySalesData.map(item => ({
      date: item.date,
      sales: parseFloat(item.sales),
      transactions: parseInt(item.transactions)
    }));

    return {
      total_sales: totalSales,
      total_transactions: totalTransactions,
      average_transaction: averageTransaction,
      top_products: topProducts,
      daily_sales: dailySales
    };
  } catch (error) {
    console.error('Sales report generation failed:', error);
    throw error;
  }
}
