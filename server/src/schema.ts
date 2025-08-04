
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'kasir', 'manajer']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schemas
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  full_name: z.string().min(1).optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Category schemas
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

export const createCategoryInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

// Product schemas
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  cost: z.number(),
  stock_quantity: z.number().int(),
  min_stock: z.number().int(),
  category_id: z.number().nullable(),
  barcode: z.string().nullable(),
  image_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().positive(),
  cost: z.number().nonnegative(),
  stock_quantity: z.number().int().nonnegative(),
  min_stock: z.number().int().nonnegative().default(5),
  category_id: z.number().nullable(),
  barcode: z.string().nullable(),
  image_url: z.string().nullable()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  cost: z.number().nonnegative().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  min_stock: z.number().int().nonnegative().optional(),
  category_id: z.number().nullable().optional(),
  barcode: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Transaction status enum
export const transactionStatusSchema = z.enum(['pending', 'completed', 'cancelled', 'refunded']);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

// Payment method enum
export const paymentMethodSchema = z.enum(['cash', 'card', 'digital_wallet', 'bank_transfer']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Transaction schemas
export const transactionSchema = z.object({
  id: z.number(),
  transaction_number: z.string(),
  user_id: z.number(),
  customer_name: z.string().nullable(),
  customer_phone: z.string().nullable(),
  subtotal: z.number(),
  tax_amount: z.number(),
  discount_amount: z.number(),
  total_amount: z.number(),
  payment_method: paymentMethodSchema,
  payment_amount: z.number(),
  change_amount: z.number(),
  status: transactionStatusSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionInputSchema = z.object({
  customer_name: z.string().nullable(),
  customer_phone: z.string().nullable(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive()
  })),
  discount_amount: z.number().nonnegative().default(0),
  tax_rate: z.number().nonnegative().default(0),
  payment_method: paymentMethodSchema,
  payment_amount: z.number().positive(),
  notes: z.string().nullable()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Transaction item schemas
export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

// Stock movement schemas
export const stockMovementTypeSchema = z.enum(['in', 'out', 'adjustment']);
export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;

export const stockMovementSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  type: stockMovementTypeSchema,
  quantity: z.number().int(),
  reference_type: z.string().nullable(),
  reference_id: z.number().nullable(),
  notes: z.string().nullable(),
  user_id: z.number(),
  created_at: z.coerce.date()
});

export type StockMovement = z.infer<typeof stockMovementSchema>;

export const createStockMovementInputSchema = z.object({
  product_id: z.number(),
  type: stockMovementTypeSchema,
  quantity: z.number().int(),
  reference_type: z.string().nullable(),
  reference_id: z.number().nullable(),
  notes: z.string().nullable()
});

export type CreateStockMovementInput = z.infer<typeof createStockMovementInputSchema>;

// Auth schemas
export const loginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const authResponseSchema = z.object({
  user: userSchema.omit({ password_hash: true }),
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Search and filter schemas
export const productSearchInputSchema = z.object({
  query: z.string().optional(),
  category_id: z.number().optional(),
  is_active: z.boolean().optional(),
  low_stock: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0)
});

export type ProductSearchInput = z.infer<typeof productSearchInputSchema>;

export const transactionSearchInputSchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  status: transactionStatusSchema.optional(),
  user_id: z.number().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0)
});

export type TransactionSearchInput = z.infer<typeof transactionSearchInputSchema>;

// Dashboard/Report schemas
export const salesReportSchema = z.object({
  total_sales: z.number(),
  total_transactions: z.number(),
  average_transaction: z.number(),
  top_products: z.array(z.object({
    product_id: z.number(),
    product_name: z.string(),
    quantity_sold: z.number(),
    revenue: z.number()
  })),
  daily_sales: z.array(z.object({
    date: z.string(),
    sales: z.number(),
    transactions: z.number()
  }))
});

export type SalesReport = z.infer<typeof salesReportSchema>;

export const dashboardStatsSchema = z.object({
  today_sales: z.number(),
  today_transactions: z.number(),
  low_stock_products: z.number(),
  total_products: z.number(),
  active_users: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
