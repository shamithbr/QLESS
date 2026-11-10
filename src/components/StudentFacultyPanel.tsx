import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Restaurant,
  FoodItem,
  Order,
  CartItem,
  PickupSlot,
  OrderStatus,
} from '../types/index.ts';
import { api, removeStoredToken } from '../services/api.ts';
import { DemoPaymentModal } from './DemoPaymentModal.tsx';
import {
  Utensils,
  ShoppingBag,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Calendar,
  CreditCard,
  Banknote,
  RotateCcw,
  Sparkles,
  ChevronRight,
  User as UserIcon,
  ChefHat,
  BellRing,
} from 'lucide-react';

interface StudentFacultyPanelProps {
  user: User;
  onLogout: () => void;
}

export const StudentFacultyPanel: React.FC<StudentFacultyPanelProps> = ({ user, onLogout }) => {
  // Navigation views
  const [currentView, setCurrentView] = useState<'restaurants' | 'menu' | 'cart' | 'orders'>('restaurants');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Data states
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [pickupSlots, setPickupSlots] = useState<PickupSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Filters & inputs
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [vegOnlyFilter, setVegOnlyFilter] = useState(false);

  // Checkout inputs
  const [selectedPickupSlot, setSelectedPickupSlot] = useState<PickupSlot | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'online_demo' | 'pay_at_counter'>('online_demo');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Demo payment gateway modal state
  const [showDemoPayment, setShowDemoPayment] = useState(false);
  const [pendingOrderPayload, setPendingOrderPayload] = useState<any | null>(null);

  // Fetch initial restaurants & customer orders
  const loadRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getRestaurants();
      setRestaurants(res.restaurants || []);
    } catch (err) {
      console.error('Failed to load restaurants:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyOrders = useCallback(async () => {
    try {
      const res = await api.getMyOrders();
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  }, []);

  useEffect(() => {
    loadRestaurants();
    loadMyOrders();

    // Auto-polling every 3.5 seconds to refresh order status transitions in real-time
    const interval = setInterval(() => {
      loadMyOrders();
    }, 3500);

    return () => clearInterval(interval);
  }, [loadRestaurants, loadMyOrders]);

  // Load menu items when restaurant selected
  const handleSelectRestaurant = async (rest: Restaurant) => {
    setSelectedRestaurant(rest);
    setSelectedCategory('All');
    setSearchQuery('');
    setCurrentView('menu');
    try {
      setMenuLoading(true);
      const res = await api.getFoodItems({ restaurantId: rest._id });
      setMenuItems(res.foodItems || []);
    } catch (err) {
      console.error('Failed to load menu items:', err);
    } finally {
      setMenuLoading(false);
    }
  };

  // Load available pickup slots for chosen restaurant
  const loadPickupSlots = async (restId: string) => {
    try {
      setSlotsLoading(true);
      const res = await api.getPickupSlots(restId);
      setPickupSlots(res.slots || []);
      // auto-select first available slot if none selected
      const firstAvailable = res.slots.find((s) => s.isAvailable);
      if (firstAvailable) {
        setSelectedPickupSlot(firstAvailable);
      }
    } catch (err) {
      console.error('Failed to load pickup slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Open cart view
  const handleOpenCart = () => {
    if (cart.length > 0) {
      const restId = cart[0].restaurantId;
      loadPickupSlots(restId);
    }
    setCurrentView('cart');
  };

  // Cart operations with single restaurant validation
  const addToCart = (item: FoodItem) => {
    if (cart.length > 0 && cart[0].restaurantId !== item.restaurantId) {
      const currentRestName = cart[0].restaurantName;
      const targetRest = restaurants.find((r) => r._id === item.restaurantId);
      const targetName = targetRest ? targetRest.name : 'another restaurant';

      if (
        window.confirm(
          `Your cart already contains items from "${currentRestName}". An order can only contain items from one restaurant. Would you like to clear your cart and start a new order with "${targetName}"?`
        )
      ) {
        setCart([
          {
            foodItem: item,
            quantity: 1,
            restaurantId: item.restaurantId,
            restaurantName: targetRest?.name || 'Restaurant',
          },
        ]);
      }
      return;
    }

    const rest = restaurants.find((r) => r._id === item.restaurantId);
    setCart((prev) => {
      const existing = prev.find((ci) => ci.foodItem._id === item._id);
      if (existing) {
        return prev.map((ci) =>
          ci.foodItem._id === item._id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [
        ...prev,
        {
          foodItem: item,
          quantity: 1,
          restaurantId: item.restaurantId,
          restaurantName: rest?.name || 'Restaurant',
        },
      ];
    });
  };

  const updateCartQuantity = (foodItemId: string, change: number) => {
    setCart((prev) => {
      return prev
        .map((ci) => {
          if (ci.foodItem._id === foodItemId) {
            const newQty = ci.quantity + change;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (foodItemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.foodItem._id !== foodItemId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedPickupSlot(null);
  };

  // Calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.foodItem.price * item.quantity, 0);
  const cartTax = Math.round(cartSubtotal * 0.05); // 5% standard canteen tax
  const cartTotal = cartSubtotal + cartTax;
  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Place Order flow
  const handleInitiateCheckout = () => {
    setCheckoutError('');

    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    if (!selectedPickupSlot) {
      setCheckoutError('Please select a valid scheduled pickup time slot.');
      return;
    }

    const orderPayload = {
      restaurantId: cart[0].restaurantId,
      items: cart.map((ci) => ({
        foodItemId: ci.foodItem._id,
        quantity: ci.quantity,
      })),
      pickupSlot: {
        date: selectedPickupSlot.date,
        time: selectedPickupSlot.time,
        formattedLabel: selectedPickupSlot.formattedLabel,
      },
      paymentMethod,
      specialInstructions,
    };

    if (paymentMethod === 'online_demo') {
      setPendingOrderPayload(orderPayload);
      setShowDemoPayment(true);
    } else {
      // Pay at Counter
      submitOrder(orderPayload, 'pending');
    }
  };

  const submitOrder = async (
    payload: any,
    paymentStatus: 'pending' | 'paid',
    transactionId?: string
  ) => {
    try {
      setIsPlacingOrder(true);
      setCheckoutError('');

      const res = await api.createOrder({
        ...payload,
        paymentStatus,
        paymentTransactionId: transactionId,
      });

      if (res.success && res.order) {
        clearCart();
        await loadMyOrders();
        setCurrentView('orders');
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Failed to place your canteen order.');
    } finally {
      setIsPlacingOrder(false);
      setShowDemoPayment(false);
      setPendingOrderPayload(null);
    }
  };

  const handleDemoPaymentSuccess = (transactionRef: string) => {
    if (pendingOrderPayload) {
      submitOrder(pendingOrderPayload, 'paid', transactionRef);
    }
  };

  const handleDemoPaymentFailure = (reason: string) => {
    setCheckoutError(`Payment Failed: ${reason} (Order was not placed)`);
    setShowDemoPayment(false);
  };

  // Helper for status badge
  const renderStatusBadge = (status: OrderStatus) => {
    const config: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
      awaiting_acceptance: {
        label: 'Awaiting Kitchen Acceptance',
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-800',
        dot: 'bg-amber-500',
      },
      accepted: {
        label: 'Order Accepted',
        bg: 'bg-sky-50 border-sky-200',
        text: 'text-sky-800',
        dot: 'bg-sky-500',
      },
      preparing: {
        label: 'Preparing Your Order',
        bg: 'bg-orange-50 border-orange-200',
        text: 'text-orange-800',
        dot: 'bg-orange-500',
      },
      ready_for_pickup: {
        label: 'Ready for Pickup!',
        bg: 'bg-emerald-50 border-emerald-200',
        text: 'text-emerald-800',
        dot: 'bg-emerald-600',
      },
      completed: {
        label: 'Order Completed',
        bg: 'bg-stone-100 border-stone-200',
        text: 'text-stone-700',
        dot: 'bg-stone-500',
      },
      rejected: {
        label: 'Order Rejected',
        bg: 'bg-rose-50 border-rose-200',
        text: 'text-rose-800',
        dot: 'bg-rose-600',
      },
      cancelled: {
        label: 'Order Cancelled',
        bg: 'bg-slate-100 border-slate-200',
        text: 'text-slate-700',
        dot: 'bg-slate-500',
      },
    };

    const s = config[status] || config.awaiting_acceptance;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${s.bg} ${s.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  };

  // Active orders count
  const activeOrdersCount = orders.filter(
    (o) => o.orderStatus !== 'completed' && o.orderStatus !== 'rejected' && o.orderStatus !== 'cancelled'
  ).length;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
      {/* Top Navigation Bar - Strict 3-zone contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setCurrentView('restaurants');
                setSelectedRestaurant(null);
              }}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-orange-600 transition-colors">
                  QLESS
                </span>
                <span className="hidden sm:inline-block text-[11px] font-medium text-slate-400 ml-2">
                  Skip the queue. Enjoy your break.
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => {
                setCurrentView('restaurants');
                setSelectedRestaurant(null);
              }}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentView === 'restaurants' || currentView === 'menu'
                  ? 'text-orange-600 font-semibold'
                  : ''
              }`}
            >
              Restaurants
            </button>
            <button
              onClick={() => setCurrentView('orders')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                currentView === 'orders' ? 'text-orange-600 font-semibold' : ''
              }`}
            >
              My Orders
              {activeOrdersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-orange-100 text-orange-700 font-bold text-[11px] rounded-md">
                  {activeOrdersCount}
                </span>
              )}
            </button>
          </nav>

          {/* Zone 3: Primary Action & User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Cart Trigger */}
            <button
              onClick={handleOpenCart}
              className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                cart.length > 0
                  ? 'bg-orange-50 border-orange-300 text-orange-900 hover:bg-orange-100'
                  : 'bg-stone-50 border-stone-200 text-slate-600 hover:bg-stone-100'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-orange-600" />
              <span className="font-mono tabular-nums">
                {cartTotalItems > 0 ? `${cartTotalItems} item${cartTotalItems > 1 ? 's' : ''}` : 'Cart'}
              </span>
              {cartSubtotal > 0 && (
                <span className="hidden sm:inline font-mono font-bold text-slate-900">
                  ₹{cartSubtotal}
                </span>
              )}
            </button>

            {/* User Greeting & Role badge */}
            <div className="hidden lg:flex items-center gap-2.5 pl-2 border-l border-stone-200 text-xs">
              <div className="text-right">
                <p className="font-semibold text-slate-900 leading-tight">{user.name}</p>
                <div className="flex items-center justify-end gap-1 text-[11px] text-slate-400">
                  <span className="uppercase font-mono">{user.userId}</span>
                  <span>&middot;</span>
                  <span className="capitalize font-medium text-orange-600">{user.role}</span>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                removeStoredToken();
                onLogout();
              }}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW 1: RESTAURANTS DIRECTORY */}
        {currentView === 'restaurants' && (
          <div className="space-y-6">
            {/* Campus Announcement / Greeting */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  Campus Pre-Ordering Active
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  What would you like to eat today, {user.name.split(' ')[0]}?
                </h2>
                <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
                  Order in advance from your favorite campus cafeterias. Select an exact pickup time to collect your hot meal without waiting in the crowd.
                </p>
              </div>

              {activeOrdersCount > 0 && (
                <button
                  onClick={() => setCurrentView('orders')}
                  className="px-4 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-orange-700 transition-colors flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <BellRing className="w-4 h-4" />
                  Track {activeOrdersCount} Active Order{activeOrdersCount > 1 ? 's' : ''}
                </button>
              )}
            </div>

            {/* Restaurants Section Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Campus Restaurants & Kiosks</h3>
                <p className="text-xs text-slate-500">5 authentic food outlets on campus</p>
              </div>
            </div>

            {/* Restaurants Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-white rounded-2xl h-80 border border-stone-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurants.map((rest) => (
                  <div
                    key={rest._id}
                    onClick={() => handleSelectRestaurant(rest)}
                    className="group bg-white rounded-2xl border border-stone-200/80 hover:border-orange-300 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
                  >
                    {/* Restaurant Cover Image */}
                    <div className="relative h-48 w-full bg-stone-100 overflow-hidden">
                      <img
                        src={rest.coverImage}
                        alt={rest.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback to high resolution food photography
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-xs text-orange-200">
                          {rest.isOpen ? 'Open Now' : 'Closed'}
                        </span>
                        <h4 className="text-xl font-bold text-white mt-1 drop-shadow-xs">
                          {rest.name}
                        </h4>
                      </div>
                    </div>

                    {/* Restaurant Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-orange-600">{rest.tagline}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {rest.description}
                        </p>
                      </div>

                      {/* Info Chips */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rest.openingTime} - {rest.closingTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <span>~{rest.leadTimeMinutes}m prep</span>
                        </div>
                      </div>

                      {/* View Menu CTA */}
                      <button
                        type="button"
                        className="w-full py-2.5 px-4 bg-stone-50 group-hover:bg-orange-600 text-slate-700 group-hover:text-white rounded-xl text-xs font-bold border border-stone-200 group-hover:border-orange-600 transition-colors flex items-center justify-center gap-2"
                      >
                        Explore Menu & Pre-Order
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: RESTAURANT MENU */}
        {currentView === 'menu' && selectedRestaurant && (
          <div className="space-y-6">
            {/* Top Back Navigation */}
            <button
              onClick={() => {
                setCurrentView('restaurants');
                setSelectedRestaurant(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Restaurants
            </button>

            {/* Restaurant Hero Banner */}
            <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs">
              <div className="relative h-56 sm:h-64 w-full bg-stone-100">
                <img
                  src={selectedRestaurant.coverImage}
                  alt={selectedRestaurant.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1000&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-orange-600 text-white">
                      {selectedRestaurant.isOpen ? 'Kitchen Open' : 'Closed'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mt-1.5">
                      {selectedRestaurant.name}
                    </h2>
                    <p className="text-xs text-orange-200 mt-0.5">{selectedRestaurant.tagline}</p>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl line-clamp-2">
                      {selectedRestaurant.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-200 shrink-0 bg-black/40 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/10">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Operating Hours</p>
                      <p className="font-semibold text-white">
                        {selectedRestaurant.openingTime} - {selectedRestaurant.closingTime}
                      </p>
                    </div>
                    <div className="w-px h-6 bg-white/20" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Lead Time</p>
                      <p className="font-semibold text-white">{selectedRestaurant.leadTimeMinutes} mins</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Controls: Search, Category Tabs, Veg Toggle */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Search in Menu */}
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search within ${selectedRestaurant.name} menu...`}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Veg Only Switch */}
                <button
                  type="button"
                  onClick={() => setVegOnlyFilter(!vegOnlyFilter)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
                    vegOnlyFilter
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-white border-stone-200 text-slate-600 hover:bg-stone-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-600 bg-emerald-500 inline-block" />
                  Pure Veg Only
                </button>
              </div>

              {/* Category Segmented Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === 'All'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-stone-200'
                  }`}
                >
                  All Items ({menuItems.length})
                </button>
                {selectedRestaurant.foodCategories.map((cat) => {
                  const count = menuItems.filter((i) => i.category.toLowerCase() === cat.toLowerCase()).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-stone-200'
                      }`}
                    >
                      {cat} {count > 0 && `(${count})`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Items Grid */}
            {menuLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-44 bg-white rounded-2xl border border-stone-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <div>
                {/* Filter items */}
                {(() => {
                  const filtered = menuItems.filter((item) => {
                    const matchesCategory =
                      selectedCategory === 'All' ||
                      item.category.toLowerCase() === selectedCategory.toLowerCase();
                    const matchesVeg = !vegOnlyFilter || item.isVeg;
                    const matchesQuery =
                      !searchQuery.trim() ||
                      item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                      item.description.toLowerCase().includes(searchQuery.toLowerCase().trim());
                    return matchesCategory && matchesVeg && matchesQuery;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                        <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">No items found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Try searching for another dish or clearing your filters.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filtered.map((item) => {
                        const inCart = cart.find((ci) => ci.foodItem._id === item._id);

                        return (
                          <div
                            key={item._id}
                            className={`bg-white rounded-2xl border border-stone-200/80 hover:border-stone-300 shadow-xs hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between ${
                              !item.isAvailable ? 'opacity-65' : ''
                            }`}
                          >
                            <div className="p-4 sm:p-5 flex gap-4">
                              {/* Details Left */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  {item.isVeg ? (
                                    <span className="w-3.5 h-3.5 rounded border border-emerald-600 p-0.5 flex items-center justify-center shrink-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                    </span>
                                  ) : (
                                    <span className="w-3.5 h-3.5 rounded border border-rose-600 p-0.5 flex items-center justify-center shrink-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                    </span>
                                  )}
                                  <span className="text-[11px] font-semibold text-slate-400 truncate">
                                    {item.category}
                                  </span>
                                </div>

                                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                  {item.name}
                                </h4>

                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>

                                <div className="mt-3">
                                  <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                                    ₹{item.price}
                                  </span>
                                </div>
                              </div>

                              {/* Thumbnail Right */}
                              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-stone-100 shrink-0 relative">
                                <img
                                  src={item.foodImage}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80';
                                  }}
                                />
                                {!item.isAvailable && (
                                  <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-1 text-center">
                                    <span className="text-[10px] font-bold text-white uppercase">
                                      Sold Out
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Bar Bottom */}
                            <div className="px-4 py-2.5 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between">
                              <span className="text-[11px] text-slate-400 font-medium">
                                {item.isAvailable ? 'Freshly made' : 'Currently unavailable'}
                              </span>

                              {item.isAvailable ? (
                                inCart ? (
                                  <div className="flex items-center gap-2 bg-orange-600 text-white rounded-lg px-2 py-1 shadow-xs">
                                    <button
                                      type="button"
                                      onClick={() => updateCartQuantity(item._id, -1)}
                                      className="p-0.5 hover:bg-orange-700 rounded transition-colors cursor-pointer"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-xs font-bold font-mono px-1">
                                      {inCart.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateCartQuantity(item._id, 1)}
                                      className="p-0.5 hover:bg-orange-700 rounded transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => addToCart(item)}
                                    className="py-1 px-3 bg-white hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 hover:border-orange-600 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add
                                  </button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="py-1 px-3 bg-stone-200 text-stone-400 rounded-lg text-xs font-medium cursor-not-allowed"
                                >
                                  Unavailable
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: CART & CHECKOUT DRAWER / PAGE */}
        {currentView === 'cart' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView(selectedRestaurant ? 'menu' : 'restaurants')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Continue Ordering
              </button>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Cart
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Your Canteen Order</h3>
                  {cart.length > 0 && (
                    <p className="text-xs text-orange-600 font-semibold mt-0.5">
                      Ordering from {cart[0].restaurantName}
                    </p>
                  )}
                </div>
                <span className="text-xs font-mono font-semibold text-slate-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                  {cartTotalItems} item{cartTotalItems !== 1 ? 's' : ''}
                </span>
              </div>

              {checkoutError && (
                <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">Your cart is empty</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Browse any of the 5 campus restaurants and add your favorite meals or beverages.
                  </p>
                  <button
                    onClick={() => setCurrentView('restaurants')}
                    className="mt-2 py-2 px-4 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors"
                  >
                    Explore Restaurants
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Itemized List */}
                  <div className="divide-y divide-stone-100">
                    {cart.map((item) => (
                      <div key={item.foodItem._id} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {item.foodItem.isVeg ? (
                            <span className="w-3 h-3 rounded border border-emerald-600 p-0.5 flex items-center justify-center shrink-0 mt-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            </span>
                          ) : (
                            <span className="w-3 h-3 rounded border border-rose-600 p-0.5 flex items-center justify-center shrink-0 mt-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            </span>
                          )}
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                              {item.foodItem.name}
                            </p>
                            <p className="text-[11px] text-slate-400">₹{item.foodItem.price} each</p>
                          </div>
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center gap-2 bg-stone-100 rounded-lg px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.foodItem._id, -1)}
                            className="p-0.5 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold font-mono text-slate-800 w-5 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.foodItem._id, 1)}
                            className="p-0.5 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right w-16">
                          <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                            ₹{item.foodItem.price * item.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Special Cooking / Pickup Instructions */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Kitchen Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Less spicy, extra chutney, pack separately..."
                      className="w-full px-3.5 py-2.5 bg-stone-50/70 border border-stone-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  {/* EXACT PICKUP TIME SELECTION (Requirement Section 15) */}
                  <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <h4 className="text-xs font-bold text-slate-900">
                          Select Exact Pickup Time
                        </h4>
                      </div>
                      <span className="text-[11px] text-orange-700 font-semibold">
                        Today &middot; {cart[0].restaurantName}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      To prevent crowded canteen queues and food getting cold, choose the exact time slot when you will come to the counter to pick up your order.
                    </p>

                    {slotsLoading ? (
                      <p className="text-xs text-slate-400 py-3 text-center">Calculating kitchen capacity slots...</p>
                    ) : pickupSlots.length === 0 ? (
                      <p className="text-xs text-rose-600 py-2">No available pickup slots for today.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
                        {pickupSlots.map((slot) => {
                          const isSelected = selectedPickupSlot?.time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.isAvailable}
                              onClick={() => setSelectedPickupSlot(slot)}
                              className={`p-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                                !slot.isAvailable
                                  ? 'bg-stone-100 border-stone-200 text-stone-400 opacity-60 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-orange-600 border-orange-600 text-white font-bold shadow-xs'
                                  : 'bg-white border-stone-200 text-slate-700 hover:border-orange-300'
                              }`}
                            >
                              <div className="font-mono text-xs">{slot.formattedLabel}</div>
                              <div
                                className={`text-[10px] mt-0.5 ${
                                  isSelected ? 'text-orange-100' : 'text-slate-400'
                                }`}
                              >
                                {!slot.isAvailable
                                  ? slot.reason?.includes('booked')
                                    ? 'Full'
                                    : 'Passed'
                                  : `${slot.bookedCount}/${slot.maxCapacity} booked`}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedPickupSlot && (
                      <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selected pickup time: {selectedPickupSlot.formattedLabel} (Capacity reserved)
                      </div>
                    )}
                  </div>

                  {/* Payment Method Selector (Requirement Section 16) */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Choose Payment Method
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Method 1: Demo Online Payment */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('online_demo')}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          paymentMethod === 'online_demo'
                            ? 'bg-orange-50/70 border-orange-400 shadow-xs'
                            : 'bg-white border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-orange-600" />
                          <span className="text-xs font-bold text-slate-900">
                            Demo Online Payment
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                          Simulated UPI / Card payment. Pre-approves order instantly in sandbox.
                        </p>
                      </button>

                      {/* Method 2: Pay at Counter */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pay_at_counter')}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          paymentMethod === 'pay_at_counter'
                            ? 'bg-orange-50/70 border-orange-400 shadow-xs'
                            : 'bg-white border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-slate-900">
                            Pay at Counter
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                          Pay directly with Cash or UPI scanner when collecting food at counter.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Bill Breakdown */}
                  <div className="p-4 bg-stone-50 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums font-semibold">₹{cartSubtotal}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Canteen GST & Maintenance (5%)</span>
                      <span className="font-mono tabular-nums font-semibold">₹{cartTax}</span>
                    </div>
                    <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-extrabold text-slate-900">
                      <span>Total Amount Payable</span>
                      <span className="font-mono tabular-nums text-base text-orange-600">
                        ₹{cartTotal}
                      </span>
                    </div>
                  </div>

                  {/* Primary Order Submission Button */}
                  <button
                    type="button"
                    disabled={isPlacingOrder || !selectedPickupSlot}
                    onClick={handleInitiateCheckout}
                    className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlacingOrder ? (
                      <span className="inline-flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        Securing Pickup Slot & Placing Order...
                      </span>
                    ) : paymentMethod === 'online_demo' ? (
                      `Proceed to Demo Online Payment (₹${cartTotal})`
                    ) : (
                      `Confirm Order (Pay ₹${cartTotal} at Counter)`
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: MY ORDERS & ORDER TRACKING */}
        {currentView === 'orders' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">My Canteen Orders</h3>
                <p className="text-xs text-slate-500">Live order status and pickup scheduling</p>
              </div>

              <button
                type="button"
                onClick={loadMyOrders}
                className="px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                Refresh Status
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
                <ChefHat className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">No orders placed yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When you place an order, its real-time kitchen preparation status and pickup instructions will appear here.
                </p>
                <button
                  onClick={() => setCurrentView('restaurants')}
                  className="mt-2 py-2 px-4 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors"
                >
                  Browse Campus Restaurants
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {orders.map((order) => {
                  // Determine status step index
                  const statusSteps: OrderStatus[] = [
                    'awaiting_acceptance',
                    'accepted',
                    'preparing',
                    'ready_for_pickup',
                    'completed',
                  ];

                  const currentStepIdx = statusSteps.indexOf(order.orderStatus);
                  const isRejectedOrCancelled =
                    order.orderStatus === 'rejected' || order.orderStatus === 'cancelled';

                  return (
                    <div
                      key={order._id}
                      className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-5"
                    >
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900 font-mono">
                              #{order.orderNumber}
                            </span>
                            <span className="text-xs text-slate-400">&middot;</span>
                            <span className="text-xs font-bold text-orange-600">
                              {order.restaurantName}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Placed on {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {renderStatusBadge(order.orderStatus)}
                        </div>
                      </div>

                      {/* WORKFLOW STATUS STEPPER (Section 14) */}
                      {!isRejectedOrCancelled ? (
                        <div className="py-2">
                          <div className="grid grid-cols-4 gap-2 text-center">
                            {/* Step 1: Placed */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-colors ${
                                  currentStepIdx >= 0
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-stone-100 text-stone-400'
                                }`}
                              >
                                1
                              </div>
                              <span className="text-[11px] font-bold text-slate-800">
                                Order Placed
                              </span>
                              <span className="text-[10px] text-slate-400">Waiting Kitchen</span>
                            </div>

                            {/* Step 2: Accepted */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-colors ${
                                  currentStepIdx >= 1
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-stone-100 text-stone-400'
                                }`}
                              >
                                2
                              </div>
                              <span className="text-[11px] font-bold text-slate-800">
                                Accepted
                              </span>
                              <span className="text-[10px] text-slate-400">Kitchen confirmed</span>
                            </div>

                            {/* Step 3: Preparing */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-colors ${
                                  currentStepIdx >= 2
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-stone-100 text-stone-400'
                                }`}
                              >
                                3
                              </div>
                              <span className="text-[11px] font-bold text-slate-800">
                                Preparing
                              </span>
                              <span className="text-[10px] text-slate-400">On the stove</span>
                            </div>

                            {/* Step 4: Ready / Completed */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-colors ${
                                  currentStepIdx >= 3
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-stone-100 text-stone-400'
                                }`}
                              >
                                4
                              </div>
                              <span className="text-[11px] font-bold text-slate-800">
                                Ready for Pickup
                              </span>
                              <span className="text-[10px] text-slate-400">Counter collection</span>
                            </div>
                          </div>

                          {/* Progress bar line */}
                          <div className="relative mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-600 transition-all duration-500 rounded-full"
                              style={{
                                width:
                                  currentStepIdx === 0
                                    ? '15%'
                                    : currentStepIdx === 1
                                    ? '38%'
                                    : currentStepIdx === 2
                                    ? '65%'
                                    : currentStepIdx >= 3
                                    ? '100%'
                                    : '0%',
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                          This order was marked as {order.orderStatus}. Please contact {order.restaurantName} staff for any queries.
                        </div>
                      )}

                      {/* Scheduled Pickup Time Alert Box */}
                      <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-600 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-700">Scheduled Pickup Slot: </span>
                            <span className="font-bold text-slate-900 font-mono">
                              {order.pickupSlot.formattedLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="font-semibold">Payment: </span>
                          <span className="font-mono capitalize font-bold text-slate-800">
                            {order.paymentMethod.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              order.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.paymentStatus.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Items Ordered List */}
                      <div className="space-y-1.5 text-xs">
                        <p className="font-semibold text-slate-700">Ordered Items:</p>
                        <div className="bg-stone-50/60 p-3 rounded-xl divide-y divide-stone-100">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="py-1.5 flex justify-between text-slate-700 first:pt-0 last:pb-0">
                              <span>
                                {item.quantity} &times; {item.name}
                              </span>
                              <span className="font-mono tabular-nums font-semibold">
                                ₹{item.price * item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between pt-2 font-bold text-slate-900 text-xs">
                          <span>Total Paid / Payable</span>
                          <span className="font-mono tabular-nums text-sm text-orange-600">
                            ₹{order.totalAmount}
                          </span>
                        </div>
                      </div>

                      {order.specialInstructions && (
                        <p className="text-[11px] text-slate-500 italic">
                          Special instructions: &ldquo;{order.specialInstructions}&rdquo;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Demo Online Payment Modal Component */}
      {showDemoPayment && (
        <DemoPaymentModal
          amount={cartTotal}
          restaurantName={cart[0]?.restaurantName || 'Campus Canteen'}
          onPaymentSuccess={handleDemoPaymentSuccess}
          onPaymentFailure={handleDemoPaymentFailure}
          onClose={() => setShowDemoPayment(false)}
        />
      )}
    </div>
  );
};
