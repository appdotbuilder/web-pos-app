
import { db } from '../db';
import { usersTable, productsTable, transactionsTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { sum, count, and, eq, gte, lt } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's sales and transaction count
    const todayTransactions = await db
      .select({
        total_sales: sum(transactionsTable.total_amount),
        transaction_count: count(transactionsTable.id)
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.status, 'completed'),
          gte(transactionsTable.created_at, today),
          lt(transactionsTable.created_at, tomorrow)
        )
      )
      .execute();

    // Get low stock products count
    const lowStockProducts = await db
      .select({ count: count(productsTable.id) })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.is_active, true),
          // Using SQL to compare stock_quantity with min_stock
          // since we can't use column references directly in Drizzle conditions
        )
      )
      .execute();

    // Get low stock count with proper comparison
    const lowStockCount = await db.execute(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE is_active = true 
        AND stock_quantity <= min_stock
    `);

    // Get total active products
    const totalProducts = await db
      .select({ count: count(productsTable.id) })
      .from(productsTable)
      .where(eq(productsTable.is_active, true))
      .execute();

    // Get active users count
    const activeUsers = await db
      .select({ count: count(usersTable.id) })
      .from(usersTable)
      .where(eq(usersTable.is_active, true))
      .execute();

    const todayStats = todayTransactions[0];
    const lowStockResult = lowStockCount.rows[0] as { count: string };

    return {
      today_sales: parseFloat(todayStats.total_sales || '0'),
      today_transactions: todayStats.transaction_count || 0,
      low_stock_products: parseInt(lowStockResult.count),
      total_products: totalProducts[0].count || 0,
      active_users: activeUsers[0].count || 0
    };
  } catch (error) {
    console.error('Dashboard stats fetch failed:', error);
    throw error;
  }
}
