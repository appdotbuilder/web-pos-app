
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { 
  Product, 
  Category, 
  CreateTransactionInput, 
  DashboardStats,
  PaymentMethod
} from '../../server/src/schema';

// Icons (using emojis for simplicity, but you could use react-icons or lucide-react)
const ICONS = {
  dashboard: '📊',
  products: '📦',
  transactions: '💳',
  reports: '📈',
  users: '👥',
  categories: '🏷️',
  settings: '⚙️',
  cart: '🛒',
  search: '🔍',
  cash: '💵',
  card: '💳',
  digital: '📱',
  bank: '🏦'
};

interface CartItem {
  product: Product;
  quantity: number;
}

type ActiveView = 'dashboard' | 'products' | 'transactions' | 'reports' | 'users' | 'categories' | 'pos';

function App() {
  // State management
  const [activeView, setActiveView] = useState<ActiveView>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load initial data
  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const loadDashboardStats = useCallback(async () => {
    try {
      const result = await trpc.getDashboardStats.query();
      setDashboardStats(result);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadDashboardStats();
  }, [loadProducts, loadCategories, loadDashboardStats]);

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev: CartItem[]) => {
      const existingItem = prev.find(item => item.product.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev: CartItem[]) =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev: CartItem[]) => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setPaymentAmount(0);
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const taxAmount = subtotal * 0.1; // 10% tax
  const total = subtotal + taxAmount;
  const changeAmount = paymentAmount > total ? paymentAmount - total : 0;

  // Process transaction
  const processTransaction = async () => {
    if (cart.length === 0 || paymentAmount < total) return;

    setIsProcessing(true);
    try {
      const transactionData: CreateTransactionInput = {
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price
        })),
        discount_amount: 0,
        tax_rate: 0.1,
        payment_method: paymentMethod,
        payment_amount: paymentAmount,
        notes: null
      };

      await trpc.createTransaction.mutate(transactionData);
      clearCart();
      loadProducts(); // Refresh to update stock
      loadDashboardStats(); // Refresh stats
      alert('🎉 Transaction completed successfully!');
    } catch (error) {
      console.error('Transaction failed:', error);
      alert('❌ Transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.barcode && product.barcode.includes(searchQuery));
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory && product.is_active;
  });

  // Sidebar Navigation
  const Sidebar = () => (
    <div className="w-64 bg-emerald-600 text-white h-screen flex flex-col">
      <div className="p-6 border-b border-emerald-500">
        <h1 className="text-xl font-bold">🏪 SmartPOS</h1>
        <p className="text-emerald-100 text-sm mt-1">Retail Management System</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {[
          { id: 'pos', label: 'Point of Sale', icon: ICONS.cart },
          { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard },
          { id: 'products', label: 'Products', icon: ICONS.products },
          { id: 'transactions', label: 'Transactions', icon: ICONS.transactions },
          { id: 'reports', label: 'Reports', icon: ICONS.reports },
          { id: 'categories', label: 'Categories', icon: ICONS.categories },
          { id: 'users', label: 'Users', icon: ICONS.users }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as ActiveView)}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              activeView === item.id
                ? 'bg-emerald-500 text-white'
                : 'text-emerald-100 hover:bg-emerald-500/50'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-emerald-500">
        <div className="text-emerald-100 text-sm">
          <p>👤 Kasir: Admin</p>
          <p>🕒 {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );

  // POS View Component
  const POSView = () => (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 p-6">
        {/* Product Search */}
        <div className="mb-6">
          <div className="flex space-x-4 mb-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
                {ICONS.search}
              </span>
              <Input
                placeholder="Search products by name or barcode..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedCategory(null)}
              className={`h-12 px-6 ${!selectedCategory ? 'bg-emerald-50 border-emerald-200' : ''}`}
            >
              All Categories
            </Button>
          </div>
          
          {/* Category Filter */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories.map((category: Category) => (
              <Button
                key={category.id}
                variant="outline"
                onClick={() => setSelectedCategory(category.id)}
                className={`whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : ''
                }`}
              >
                🏷️ {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          {filteredProducts.map((product: Product) => (
            <Card
              key={product.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => addToCart(product)}
            >
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-3xl mb-2">📦</div>
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-emerald-600 font-bold text-lg">
                    ${product.price.toFixed(2)}
                  </p>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <span>Stock: {product.stock_quantity}</span>
                    {product.stock_quantity <= product.min_stock && (
                      <Badge variant="destructive" className="text-xs">
                        Low Stock!
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Shopping Cart Sidebar */}
      <div className="w-96 bg-white shadow-lg border-l">
        <div className="p-6 border-b bg-emerald-50">
          <h2 className="text-xl font-bold text-emerald-800 flex items-center">
            <span className="mr-2 text-2xl">{ICONS.cart}</span>
            Shopping Cart
          </h2>
          <p className="text-emerald-600 text-sm">{cart.length} items</p>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[40vh] p-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">🛒</div>
              <p>Cart is empty</p>
              <p className="text-sm">Add products to start selling</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item: CartItem) => (
                <div key={item.product.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.product.name}</h4>
                    <p className="text-emerald-600 font-semibold">
                      ${item.product.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      className="h-8 w-8 p-0"
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      className="h-8 w-8 p-0"
                    >
                      +
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeFromCart(item.product.id)}
                      className="h-8 w-8 p-0 ml-2"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Info & Payment */}
        <div className="p-4 border-t space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
            />
            <Input
              placeholder="Customer phone (optional)"
              value={customerPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPhone(e.target.value)}
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'cash' as PaymentMethod, label: 'Cash', icon: ICONS.cash },
                { value: 'card' as PaymentMethod, label: 'Card', icon: ICONS.card },
                { value: 'digital_wallet' as PaymentMethod, label: 'E-Wallet', icon: ICONS.digital },
                { value: 'bank_transfer' as PaymentMethod, label: 'Transfer', icon: ICONS.bank }
              ].map((method) => (
                <Button
                  key={method.value}
                  variant={paymentMethod === method.value ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod(method.value)}
                  className="h-12 text-xs"
                >
                  <span className="mr-1">{method.icon}</span>
                  {method.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (10%):</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span className="text-emerald-600">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-medium mb-1">Payment Amount</label>
            <Input
              type="number"
              value={paymentAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setPaymentAmount(parseFloat(e.target.value) || 0)
              }
              step="0.01"
              min={total}
              className="text-lg h-12"
            />
            {changeAmount > 0 && (
              <p className="text-sm text-green-600 mt-1">
                Change: ${changeAmount.toFixed(2)}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={processTransaction}
              disabled={cart.length === 0 || paymentAmount < total || isProcessing}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-lg font-semibold"
            >
              {isProcessing ? 'Processing...' : `💳 Process Payment ($${total.toFixed(2)})`}
            </Button>
            <Button
              variant="outline"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="w-full"
            >
              🗑️ Clear Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Dashboard View Component
  const DashboardView = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">📊 Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your business overview.</p>
      </div>

      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100">Today's Sales</p>
                  <p className="text-2xl font-bold">${dashboardStats.today_sales.toFixed(2)}</p>
                </div>
                <div className="text-3xl">💰</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Transactions</p>
                  <p className="text-2xl font-bold">{dashboardStats.today_transactions}</p>
                </div>
                <div className="text-3xl">🧾</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100">Low Stock</p>
                  <p className="text-2xl font-bold">{dashboardStats.low_stock_products}</p>
                </div>
                <div className="text-3xl">⚠️</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Total Products</p>
                  <p className="text-2xl font-bold">{dashboardStats.total_products}</p>
                </div>
                <div className="text-3xl">📦</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Active Users</p>
                  <p className="text-2xl font-bold">{dashboardStats.active_users}</p>
                </div>
                <div className="text-3xl">👥</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>📈 Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setActiveView('pos')} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700">
              🛒 Start New Sale
            </Button>
            <Button onClick={() => setActiveView('products')} variant="outline" className="w-full h-12">
              📦 Manage Products
            </Button>
            <Button onClick={() => setActiveView('reports')} variant="outline" className="w-full h-12">
              📊 View Reports
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🎯 Today's Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                <span className="text-emerald-700">💰 Sales Revenue</span>
                <span className="font-bold text-emerald-600">
                  ${dashboardStats?.today_sales.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-700">🧾 Transactions</span>
                <span className="font-bold text-blue-600">
                  {dashboardStats?.today_transactions || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-yellow-700">⚠️ Low Stock Alerts</span>
                <span className="font-bold text-yellow-600">
                  {dashboardStats?.low_stock_products || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        {activeView === 'pos' && <POSView />}
        {activeView === 'dashboard' && <DashboardView />}
        {activeView !== 'pos' && activeView !== 'dashboard' && (
          <div className="p-6">
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🚧</div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">
                {activeView.charAt(0).toUpperCase() + activeView.slice(1)} Module
              </h2>
              <p className="text-gray-500">This section is under development</p>
              <Button 
                onClick={() => setActiveView('pos')} 
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                🛒 Back to POS
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
