import React, { useState, useEffect, useCallback } from 'react';
import { User, Order, FoodItem, OrderStatus, PaymentStatus } from '../types/index.ts';
import { api, removeStoredToken } from '../services/api.ts';
import {
  Utensils,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  X,
  Plus,
  Edit2,
  DollarSign,
  ChefHat,
  ShoppingBag,
  RotateCcw,
  LogOut,
  SlidersHorizontal,
  Search,
  Phone,
  User as UserIcon,
  ShieldCheck,
  Power,
} from 'lucide-react';

interface RestaurantOwnerPanelProps {
  user: User;
  onLogout: () => void;
}

export const RestaurantOwnerPanel: React.FC<RestaurantOwnerPanelProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'live_orders' | 'menu_management' | 'sales_history'>('live_orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionError, setActionError] = useState('');

  // Editing price state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);

  // New item modal state
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number>(50);
  const [newItemIsVeg, setNewItemIsVeg] = useState(true);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const restaurantId = user.restaurantId || '';
  const restaurantName = user.assignedRestaurant?.name || 'Your Assigned Restaurant';

  // Load orders for this restaurant only
  const loadOrders = useCallback(async () => {
    if (!restaurantId) return;
    try {
      setLoadingOrders(true);
      const res = await api.getRestaurantOrders(restaurantId);
      setOrders(res.orders || []);
    } catch (err: any) {
      console.error('Failed to load restaurant orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [restaurantId]);

  // Load menu items for this restaurant
  const loadMenu = useCallback(async () => {
    if (!restaurantId) return;
    try {
      setLoadingMenu(true);
      const res = await api.getFoodItems({ restaurantId });
      setMenuItems(res.foodItems || []);
    } catch (err: any) {
      console.error('Failed to load menu items:', err);
    } finally {
      setLoadingMenu(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadOrders();
    loadMenu();

    // Poll orders every 4 seconds for live kitchen updates
    const interval = setInterval(() => {
      loadOrders();
    }, 4000);

    return () => clearInterval(interval);
  }, [loadOrders, loadMenu]);

  // STRICT ORDER STATUS WORKFLOW ACTIONS (Section 14)
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, note?: string) => {
    try {
      setActionError('');
      const res = await api.updateOrderStatus(orderId, newStatus, note);
      if (res.success && res.order) {
        setOrders((prev) => prev.map((o) => (o._id === orderId ? res.order : o)));
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update order status');
    }
  };

  // Payment status update (Pay at Counter)
  const handleUpdatePayment = async (orderId: string, paymentStatus: PaymentStatus) => {
    try {
      setActionError('');
      const res = await api.updateOrderPayment(orderId, paymentStatus);
      if (res.success && res.order) {
        setOrders((prev) => prev.map((o) => (o._id === orderId ? res.order : o)));
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update payment status');
    }
  };

  // Toggle food item availability
  const handleToggleAvailability = async (item: FoodItem) => {
    try {
      const res = await api.updateFoodAvailability(item._id, !item.isAvailable);
      if (res.success && res.foodItem) {
        setMenuItems((prev) => prev.map((m) => (m._id === item._id ? res.foodItem : m)));
      }
    } catch (err: any) {
      alert(`Could not update availability: ${err.message}`);
    }
  };

  // Save updated price
  const handleSavePrice = async (itemId: string) => {
    if (editingPrice <= 0) return;
    try {
      const res = await api.updateFoodPrice(itemId, editingPrice);
      if (res.success && res.foodItem) {
        setMenuItems((prev) => prev.map((m) => (m._id === itemId ? res.foodItem : m)));
        setEditingItemId(null);
      }
    } catch (err: any) {
      alert(`Could not update price: ${err.message}`);
    }
  };

  // Add new food item
  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemCategory.trim() || newItemPrice <= 0) return;

    try {
      setIsAddingItem(true);
      const res = await api.addFoodItem({
        name: newItemName.trim(),
        description: newItemDescription.trim() || 'Freshly prepared specialty dish.',
        category: newItemCategory.trim(),
        price: newItemPrice,
        isVeg: newItemIsVeg,
        isAvailable: true,
      });

      if (res.success && res.foodItem) {
        setMenuItems((prev) => [res.foodItem, ...prev]);
        setShowAddItemModal(false);
        setNewItemName('');
        setNewItemDescription('');
        setNewItemCategory('');
        setNewItemPrice(50);
      }
    } catch (err: any) {
      alert(`Failed to add food item: ${err.message}`);
    } finally {
      setIsAddingItem(false);
    }
  };

  // Computed Kitchen KPIs
  const pendingOrders = orders.filter((o) => o.orderStatus === 'awaiting_acceptance');
  const acceptedOrders = orders.filter((o) => o.orderStatus === 'accepted');
  const preparingOrders = orders.filter((o) => o.orderStatus === 'preparing');
  const readyOrders = orders.filter((o) => o.orderStatus === 'ready_for_pickup');
  const completedOrders = orders.filter((o) => o.orderStatus === 'completed');

  const totalRevenue = orders
    .filter((o) => o.orderStatus === 'completed' || o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Filtered orders for view
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.orderStatus === statusFilter;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col selection:bg-orange-100 selection:text-orange-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900">
                  {restaurantName}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 uppercase">
                  Kitchen Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Logged in as {user.name} ({user.userId})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                loadOrders();
                loadMenu();
              }}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 hover:bg-stone-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Refresh
            </button>

            <button
              onClick={() => {
                removeStoredToken();
                onLogout();
              }}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Dashboard Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">New Pending</p>
            <p className="text-2xl font-black text-amber-600 mt-1 font-mono tabular-nums">
              {pendingOrders.length}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Needs acceptance</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Accepted</p>
            <p className="text-2xl font-black text-sky-600 mt-1 font-mono tabular-nums">
              {acceptedOrders.length}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Ready to prepare</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">In Kitchen</p>
            <p className="text-2xl font-black text-orange-600 mt-1 font-mono tabular-nums">
              {preparingOrders.length}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Cooking now</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Ready at Counter</p>
            <p className="text-2xl font-black text-emerald-600 mt-1 font-mono tabular-nums">
              {readyOrders.length}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Awaiting collection</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs col-span-2 sm:col-span-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Sales</p>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono tabular-nums">
              ₹{totalRevenue}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{completedOrders.length} completed</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-stone-200 space-x-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('live_orders')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'live_orders'
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Kitchen Order Queue
            {pendingOrders.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('menu_management')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'menu_management'
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Menu & Availability ({menuItems.length} items)
          </button>
        </div>

        {actionError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: KITCHEN ORDER QUEUE */}
        {activeTab === 'live_orders' && (
          <div className="space-y-4">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {[
                { id: 'all', label: 'All Orders' },
                { id: 'awaiting_acceptance', label: `Pending Acceptance (${pendingOrders.length})` },
                { id: 'accepted', label: `Accepted (${acceptedOrders.length})` },
                { id: 'preparing', label: `Cooking (${preparingOrders.length})` },
                { id: 'ready_for_pickup', label: `Ready for Pickup (${readyOrders.length})` },
                { id: 'completed', label: `Completed (${completedOrders.length})` },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === filter.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-stone-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-2">
                <ChefHat className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No orders matching this filter</p>
                <p className="text-xs text-slate-400">
                  New incoming customer orders will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOrders.map((order) => {
                  return (
                    <div
                      key={order._id}
                      className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4 flex flex-col justify-between"
                    >
                      {/* Top info */}
                      <div>
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black text-slate-900 font-mono">
                                #{order.orderNumber}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  order.orderStatus === 'awaiting_acceptance'
                                    ? 'bg-amber-100 text-amber-800'
                                    : order.orderStatus === 'accepted'
                                    ? 'bg-sky-100 text-sky-800'
                                    : order.orderStatus === 'preparing'
                                    ? 'bg-orange-100 text-orange-800'
                                    : order.orderStatus === 'ready_for_pickup'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                {order.orderStatus.replace(/_/g, ' ')}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                              {order.customerName} ({order.customerRole}) &middot;{' '}
                              <Phone className="w-3 h-3 text-slate-400 inline" /> {order.customerPhone}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-extrabold text-slate-900 font-mono tabular-nums">
                              ₹{order.totalAmount}
                            </span>
                            <div className="text-[10px] mt-0.5">
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                                  order.paymentStatus === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {order.paymentStatus}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Exact Pickup Slot Highlight */}
                        <div className="mt-3 p-2.5 bg-orange-50/70 border border-orange-200 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-orange-950 font-medium">
                            <Clock className="w-4 h-4 text-orange-600 shrink-0" />
                            <span>Customer Pickup Slot:</span>
                          </div>
                          <span className="font-bold text-orange-900 font-mono">
                            {order.pickupSlot.formattedLabel}
                          </span>
                        </div>

                        {/* Items List */}
                        <div className="mt-3 space-y-1 text-xs">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase">Items:</p>
                          <div className="bg-stone-50 rounded-xl p-2.5 space-y-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-slate-800 font-medium">
                                <span>
                                  <strong className="text-orange-600 font-bold">{item.quantity}x</strong>{' '}
                                  {item.name}
                                </span>
                                <span className="font-mono tabular-nums text-slate-500">
                                  ₹{item.price * item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {order.specialInstructions && (
                          <p className="mt-2 text-[11px] text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200 italic">
                            &ldquo;{order.specialInstructions}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* BOTTOM ACTIONS BAR - Strict Workflow (Section 14) */}
                      <div className="pt-3 border-t border-stone-100 space-y-2">
                        {/* Step 1: Initial state -> Accept or Reject */}
                        {order.orderStatus === 'awaiting_acceptance' && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order._id, 'accepted', 'Order accepted by kitchen')}
                              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Accept Order
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order._id, 'rejected', 'Order rejected due to kitchen capacity')}
                              className="py-2 px-3 bg-stone-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-semibold border border-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5 text-rose-500" />
                              Reject
                            </button>
                          </div>
                        )}

                        {/* Step 2: Accepted -> Explicit "Start Preparing" (Section 14 Requirement) */}
                        {order.orderStatus === 'accepted' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order._id, 'preparing', 'Kitchen chef started preparing the food')}
                            className="w-full py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Start Preparing (Kitchen Cooked)
                          </button>
                        )}

                        {/* Step 3: Preparing -> "Mark Ready for Pickup" */}
                        {order.orderStatus === 'preparing' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order._id, 'ready_for_pickup', 'Food is ready at pickup counter')}
                            className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Mark Ready for Pickup (On Counter)
                          </button>
                        )}

                        {/* Step 4: Ready for Pickup -> "Mark Collected" */}
                        {order.orderStatus === 'ready_for_pickup' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order._id, 'completed', 'Food handed over to customer')}
                            className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Mark Collected (Handover Complete)
                          </button>
                        )}

                        {/* Pay at Counter pending payment collector */}
                        {order.paymentMethod === 'pay_at_counter' && order.paymentStatus === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleUpdatePayment(order._id, 'paid')}
                            className="w-full py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                            Collect Payment (Mark ₹{order.totalAmount} as Paid)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MENU & AVAILABILITY MANAGEMENT */}
        {activeTab === 'menu_management' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Manage Menu Items & Prices</h3>
                <p className="text-xs text-slate-500">
                  Toggle food availability in real-time or update canteen prices
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddItemModal(true)}
                className="py-2 px-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Dish
              </button>
            </div>

            {loadingMenu ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 bg-white rounded-2xl border border-stone-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {menuItems.map((item) => {
                  const isEditing = editingItemId === item._id;

                  return (
                    <div
                      key={item._id}
                      className={`p-4 bg-white rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                        item.isAvailable
                          ? 'border-stone-200 shadow-xs'
                          : 'border-stone-200 bg-stone-50/60 opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                          <img
                            src={item.foodImage}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=80';
                            }}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {item.isVeg ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                            )}
                            <span className="text-[10px] uppercase font-semibold text-slate-400">
                              {item.category}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>

                          {/* Price */}
                          <div className="mt-1">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold">₹</span>
                                <input
                                  type="number"
                                  value={editingPrice}
                                  onChange={(e) => setEditingPrice(Number(e.target.value))}
                                  className="w-16 px-1.5 py-0.5 border border-orange-400 rounded text-xs font-mono"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSavePrice(item._id)}
                                  className="px-2 py-0.5 bg-orange-600 text-white rounded text-[10px] font-bold"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemId(null)}
                                  className="px-1.5 py-0.5 text-slate-400 text-[10px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-extrabold text-slate-900 font-mono tabular-nums">
                                  ₹{item.price}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItemId(item._id);
                                    setEditingPrice(item.price);
                                  }}
                                  className="text-slate-400 hover:text-orange-600 p-0.5 transition-colors cursor-pointer"
                                  title="Edit Price"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Availability Toggle Switch */}
                      <div className="text-right shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                            item.isAvailable
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                              : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {item.isAvailable ? 'Available' : 'Sold Out'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal: Add New Dish */}
        {showAddItemModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-stone-200 p-6 relative">
              <button
                onClick={() => setShowAddItemModal(false)}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 mb-1">Add Food Item to Menu</h3>
              <p className="text-xs text-slate-500 mb-4">Adding to {restaurantName}</p>

              <form onSubmit={handleCreateNewItem} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dish Name</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Paneer Butter Masala Roll"
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    placeholder="e.g. Rolls, Breakfast, Meals, Beverages"
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price in INR (₹)</label>
                  <input
                    type="number"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(Number(e.target.value))}
                    min="1"
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="Brief description of the dish, preparation style, or ingredients..."
                    rows={2}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="vegToggle"
                    checked={newItemIsVeg}
                    onChange={(e) => setNewItemIsVeg(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="vegToggle" className="font-semibold text-slate-700">
                    Vegetarian Dish
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowAddItemModal(false)}
                    className="px-4 py-2 border border-stone-200 rounded-xl font-medium text-slate-600 hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingItem}
                    className="px-4 py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors"
                  >
                    {isAddingItem ? 'Saving...' : 'Add to Menu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
