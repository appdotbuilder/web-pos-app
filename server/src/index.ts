
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  loginInputSchema, 
  createUserInputSchema, 
  updateUserInputSchema,
  createCategoryInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  productSearchInputSchema,
  createTransactionInputSchema,
  transactionSearchInputSchema,
  createStockMovementInputSchema
} from './schema';

// Import handlers
import { loginUser } from './handlers/auth_login';
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { searchProducts } from './handlers/search_products';
import { updateProduct } from './handlers/update_product';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { searchTransactions } from './handlers/search_transactions';
import { getTransactionDetails } from './handlers/get_transaction_details';
import { createStockMovement } from './handlers/create_stock_movement';
import { getStockMovements } from './handlers/get_stock_movements';
import { getLowStockProducts } from './handlers/get_low_stock_products';
import { getSalesReport } from './handlers/get_sales_report';
import { getDashboardStats } from './handlers/get_dashboard_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  getUsers: publicProcedure
    .query(() => getUsers()),
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Category management
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),
  getCategories: publicProcedure
    .query(() => getCategories()),

  // Product management
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  getProducts: publicProcedure
    .query(() => getProducts()),
  searchProducts: publicProcedure
    .input(productSearchInputSchema)
    .query(({ input }) => searchProducts(input)),
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),
  getLowStockProducts: publicProcedure
    .query(() => getLowStockProducts()),

  // Transaction management
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),
  getTransactions: publicProcedure
    .query(() => getTransactions()),
  searchTransactions: publicProcedure
    .input(transactionSearchInputSchema)
    .query(({ input }) => searchTransactions(input)),
  getTransactionDetails: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTransactionDetails(input.id)),

  // Stock management
  createStockMovement: publicProcedure
    .input(createStockMovementInputSchema)
    .mutation(({ input }) => createStockMovement(input)),
  getStockMovements: publicProcedure
    .input(z.object({ productId: z.number().optional() }))
    .query(({ input }) => getStockMovements(input.productId)),

  // Reports and dashboard
  getSalesReport: publicProcedure
    .input(z.object({ 
      startDate: z.coerce.date(), 
      endDate: z.coerce.date() 
    }))
    .query(({ input }) => getSalesReport(input.startDate, input.endDate)),
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`POS TRPC server listening at port: ${port}`);
}

start();
