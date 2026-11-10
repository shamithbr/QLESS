import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  IUser,
  IRestaurant,
  IFoodItem,
  IOrder,
  IPaymentRecord,
  IPickupSlotBooking,
  OrderStatus,
  PaymentStatus,
  UserSchema,
  RestaurantSchema,
  FoodItemSchema,
  OrderSchema,
  PaymentRecordSchema,
  PickupSlotBookingSchema,
} from './schema.ts';
import {
  INITIAL_RESTAURANTS,
  INITIAL_FOOD_ITEMS,
  getInitialUsers,
} from './seedData.ts';

// File-backed persistence file for local development without external Mongo daemon
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'qless_db.json');

interface LocalDatabaseState {
  users: IUser[];
  restaurants: IRestaurant[];
  foodItems: IFoodItem[];
  orders: IOrder[];
  payments: IPaymentRecord[];
  slotBookings: IPickupSlotBooking[];
}

let isMongoConnected = false;
let localState: LocalDatabaseState = {
  users: [],
  restaurants: [],
  foodItems: [],
  orders: [],
  payments: [],
  slotBookings: [],
};

// Mongoose Models
export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const RestaurantModel = mongoose.models.Restaurant || mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);
export const FoodItemModel = mongoose.models.FoodItem || mongoose.model<IFoodItem>('FoodItem', FoodItemSchema);
export const OrderModel = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
export const PaymentRecordModel = mongoose.models.PaymentRecord || mongoose.model<IPaymentRecord>('PaymentRecord', PaymentRecordSchema);
export const PickupSlotBookingModel = mongoose.models.PickupSlotBooking || mongoose.model<IPickupSlotBooking>('PickupSlotBooking', PickupSlotBookingSchema);

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function saveLocalState(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(localState, null, 2), 'utf-8');
  } catch (err) {
    console.error('[QLESS DB] Error saving local state:', err);
  }
}

function loadLocalState(): void {
  try {
    ensureDataDir();
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      localState = JSON.parse(data);
    } else {
      seedLocalStore();
    }
  } catch (err) {
    console.warn('[QLESS DB] Could not read local db file, seeding fresh:', err);
    seedLocalStore();
  }
}

export function seedLocalStore(force = false): void {
  if (!force && localState.users.length > 0 && localState.restaurants.length > 0) {
    return;
  }

  const users = getInitialUsers();
  localState.users = users;
  localState.restaurants = [...INITIAL_RESTAURANTS];
  localState.foodItems = [...INITIAL_FOOD_ITEMS];
  localState.orders = [];
  localState.payments = [];
  localState.slotBookings = [];

  saveLocalState();
  console.log(`[QLESS DB] Local store seeded successfully with ${users.length} users, ${INITIAL_RESTAURANTS.length} restaurants, and ${INITIAL_FOOD_ITEMS.length} food items.`);
}

export async function initDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri && mongoUri.trim().length > 0) {
    try {
      console.log('[QLESS DB] Attempting connection to MongoDB Atlas...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      isMongoConnected = true;
      console.log('[QLESS DB] Successfully connected to MongoDB Atlas!');
      await seedMongoDatabase();
      return;
    } catch (err) {
      console.warn('[QLESS DB] MongoDB Atlas connection failed or timed out. Falling back to robust embedded local database.', err);
      isMongoConnected = false;
    }
  }

  // Fallback to embedded persistence
  loadLocalState();
  // Ensure seed is populated
  if (localState.restaurants.length === 0 || localState.foodItems.length === 0 || localState.users.length === 0) {
    seedLocalStore(true);
  }
  console.log('[QLESS DB] Embedded persistent database active. All features fully operational.');
}

export async function seedMongoDatabase(): Promise<void> {
  if (!isMongoConnected) return;

  try {
    const existingUsers = await UserModel.countDocuments();
    if (existingUsers === 0) {
      console.log('[QLESS DB] Seeding initial users into MongoDB Atlas...');
      const users = getInitialUsers();
      await UserModel.insertMany(users);
    }

    const existingRestaurants = await RestaurantModel.countDocuments();
    if (existingRestaurants === 0) {
      console.log('[QLESS DB] Seeding restaurants into MongoDB Atlas...');
      await RestaurantModel.insertMany(INITIAL_RESTAURANTS);
    }

    const existingFood = await FoodItemModel.countDocuments();
    if (existingFood === 0) {
      console.log('[QLESS DB] Seeding food menu items into MongoDB Atlas...');
      await FoodItemModel.insertMany(INITIAL_FOOD_ITEMS);
    }
  } catch (err) {
    console.error('[QLESS DB] Error seeding MongoDB Atlas:', err);
  }
}

// ----------------- USER REPOSITORY -----------------

export async function findUserByIdentifier(identifier: string): Promise<IUser | null> {
  const cleanId = identifier.trim();
  if (isMongoConnected) {
    const doc = await UserModel.findOne({
      $or: [
        { userId: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
        { email: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
      ],
    }).lean();
    return doc as unknown as IUser;
  }

  const user = localState.users.find(
    (u) =>
      u.userId.toLowerCase() === cleanId.toLowerCase() ||
      u.email.toLowerCase() === cleanId.toLowerCase()
  );
  return user ? { ...user } : null;
}

export async function findUserByUserId(userId: string): Promise<IUser | null> {
  if (isMongoConnected) {
    const doc = await UserModel.findOne({ userId }).lean();
    return doc as unknown as IUser;
  }
  const user = localState.users.find((u) => u.userId === userId);
  return user ? { ...user } : null;
}

// ----------------- RESTAURANT REPOSITORY -----------------

export async function getAllRestaurants(): Promise<IRestaurant[]> {
  if (isMongoConnected) {
    const docs = await RestaurantModel.find().lean();
    return docs as unknown as IRestaurant[];
  }
  return [...localState.restaurants];
}

export async function getRestaurantById(id: string): Promise<IRestaurant | null> {
  if (isMongoConnected) {
    const doc = await RestaurantModel.findOne({
      $or: [{ _id: id }, { slug: id }],
    }).lean();
    return doc as unknown as IRestaurant;
  }
  const rest = localState.restaurants.find((r) => r._id === id || r.slug === id);
  return rest ? { ...rest } : null;
}

export async function getRestaurantByOwnerId(ownerUserId: string): Promise<IRestaurant | null> {
  if (isMongoConnected) {
    const doc = await RestaurantModel.findOne({ ownerUserId }).lean();
    return doc as unknown as IRestaurant;
  }
  const rest = localState.restaurants.find((r) => r.ownerUserId === ownerUserId);
  return rest ? { ...rest } : null;
}

// ----------------- FOOD ITEMS REPOSITORY -----------------

export async function getFoodItemsByRestaurant(restaurantId: string): Promise<IFoodItem[]> {
  if (isMongoConnected) {
    const docs = await FoodItemModel.find({ restaurantId }).lean();
    return docs as unknown as IFoodItem[];
  }
  return localState.foodItems.filter((item) => item.restaurantId === restaurantId);
}

export async function getAllFoodItems(): Promise<IFoodItem[]> {
  if (isMongoConnected) {
    const docs = await FoodItemModel.find().lean();
    return docs as unknown as IFoodItem[];
  }
  return [...localState.foodItems];
}

export async function updateFoodItemAvailability(
  foodItemId: string,
  restaurantId: string,
  isAvailable: boolean
): Promise<IFoodItem | null> {
  if (isMongoConnected) {
    const doc = await FoodItemModel.findOneAndUpdate(
      { _id: foodItemId, restaurantId },
      { $set: { isAvailable } },
      { new: true }
    ).lean();
    return doc as unknown as IFoodItem;
  }

  const itemIndex = localState.foodItems.findIndex(
    (f) => f._id === foodItemId && f.restaurantId === restaurantId
  );
  if (itemIndex === -1) return null;

  localState.foodItems[itemIndex].isAvailable = isAvailable;
  saveLocalState();
  return { ...localState.foodItems[itemIndex] };
}

export async function updateFoodItemPrice(
  foodItemId: string,
  restaurantId: string,
  price: number
): Promise<IFoodItem | null> {
  if (isMongoConnected) {
    const doc = await FoodItemModel.findOneAndUpdate(
      { _id: foodItemId, restaurantId },
      { $set: { price } },
      { new: true }
    ).lean();
    return doc as unknown as IFoodItem;
  }

  const itemIndex = localState.foodItems.findIndex(
    (f) => f._id === foodItemId && f.restaurantId === restaurantId
  );
  if (itemIndex === -1) return null;

  localState.foodItems[itemIndex].price = price;
  saveLocalState();
  return { ...localState.foodItems[itemIndex] };
}

export async function addFoodItem(
  restaurantId: string,
  itemData: Omit<IFoodItem, '_id' | 'restaurantId' | 'createdAt'>
): Promise<IFoodItem> {
  const newItem: IFoodItem = {
    _id: `food_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    restaurantId,
    name: itemData.name,
    description: itemData.description,
    category: itemData.category,
    price: itemData.price,
    foodImage: itemData.foodImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
    isAvailable: itemData.isAvailable ?? true,
    isVeg: itemData.isVeg ?? true,
    createdAt: new Date(),
  };

  if (isMongoConnected) {
    const created = await FoodItemModel.create(newItem);
    return created.toObject();
  }

  localState.foodItems.push(newItem);
  saveLocalState();
  return { ...newItem };
}

// ----------------- PICKUP SLOT ENGINE -----------------

export interface GeneratedSlot {
  time: string; // "13:30"
  formattedLabel: string; // "01:30 PM"
  date: string; // "2026-11-06"
  isAvailable: boolean;
  bookedCount: number;
  maxCapacity: number;
  reason?: string;
}

export async function getAvailablePickupSlots(restaurantId: string, targetDateStr?: string): Promise<GeneratedSlot[]> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');

  const now = new Date();
  const dateStr = targetDateStr || now.toISOString().split('T')[0];
  const isToday = dateStr === now.toISOString().split('T')[0];

  const [openHour, openMin] = restaurant.openingTime.split(':').map(Number);
  const [closeHour, closeMin] = restaurant.closingTime.split(':').map(Number);
  const interval = restaurant.slotIntervalMinutes || 15;
  const leadTime = restaurant.leadTimeMinutes || 15;
  const maxCapacity = restaurant.maxOrdersPerSlot || 10;

  // Lead time cutoff
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes() + leadTime;
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  const slots: GeneratedSlot[] = [];

  for (let m = openMinutes; m <= closeMinutes; m += interval) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

    // Format 12-hour label
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const label = `${String(displayHour).padStart(2, '0')}:${String(min).padStart(2, '0')} ${ampm}`;

    // Past time validation
    let isSlotPast = false;
    if (isToday && m < currentMinutesFromMidnight) {
      isSlotPast = true;
    }

    // Check existing bookings
    let bookedCount = 0;
    if (isMongoConnected) {
      const booking = await PickupSlotBookingModel.findOne({
        restaurantId,
        date: dateStr,
        timeSlot: timeStr,
      });
      bookedCount = booking ? booking.currentBookings : 0;
    } else {
      const booking = localState.slotBookings.find(
        (b) => b.restaurantId === restaurantId && b.date === dateStr && b.timeSlot === timeStr
      );
      bookedCount = booking ? booking.currentBookings : 0;
    }

    const isFull = bookedCount >= maxCapacity;
    const isAvailable = !isSlotPast && !isFull && restaurant.isOpen;

    let reason: string | undefined;
    if (isSlotPast) reason = 'Past time or inside preparation lead time';
    else if (isFull) reason = 'Slot fully booked';
    else if (!restaurant.isOpen) reason = 'Restaurant closed';

    slots.push({
      time: timeStr,
      formattedLabel: label,
      date: dateStr,
      isAvailable,
      bookedCount,
      maxCapacity,
      reason,
    });
  }

  return slots;
}

// ----------------- ORDER REPOSITORY & WORKFLOW -----------------

export async function createOrderAtomic(orderData: {
  customerUserId: string;
  customerName: string;
  customerRole: 'student' | 'faculty';
  customerPhone: string;
  restaurantId: string;
  items: { foodItemId: string; quantity: number }[];
  pickupSlot: { date: string; time: string; formattedLabel: string };
  paymentMethod: 'online_demo' | 'pay_at_counter';
  paymentStatus: PaymentStatus;
  paymentTransactionId?: string;
  specialInstructions?: string;
}): Promise<IOrder> {
  const restaurant = await getRestaurantById(orderData.restaurantId);
  if (!restaurant) throw new Error('Restaurant does not exist');
  if (!restaurant.isOpen) throw new Error('Restaurant is currently closed');

  // 1. Validate Single Restaurant & verify food items
  const menu = await getFoodItemsByRestaurant(orderData.restaurantId);
  const menuMap = new Map(menu.map((item) => [item._id, item]));

  const orderItems = [];
  let subtotal = 0;

  for (const item of orderData.items) {
    const menuItem = menuMap.get(item.foodItemId);
    if (!menuItem) {
      throw new Error(`Item ${item.foodItemId} does not belong to ${restaurant.name} or is unavailable.`);
    }
    if (!menuItem.isAvailable) {
      throw new Error(`"${menuItem.name}" is currently marked unavailable by the kitchen.`);
    }
    if (item.quantity <= 0) {
      throw new Error('Quantity must be greater than zero.');
    }

    const lineTotal = menuItem.price * item.quantity;
    subtotal += lineTotal;
    orderItems.push({
      foodItemId: menuItem._id!,
      name: menuItem.name,
      price: menuItem.price,
      quantity: item.quantity,
      isVeg: menuItem.isVeg,
    });
  }

  if (orderItems.length === 0) {
    throw new Error('Order must contain at least one valid item');
  }

  // 2. Exact Pickup Slot Capacity Validation
  const maxCap = restaurant.maxOrdersPerSlot || 10;
  let slotBooked = 0;

  if (isMongoConnected) {
    const existingSlot = await PickupSlotBookingModel.findOne({
      restaurantId: orderData.restaurantId,
      date: orderData.pickupSlot.date,
      timeSlot: orderData.pickupSlot.time,
    });
    slotBooked = existingSlot ? existingSlot.currentBookings : 0;
  } else {
    const existingSlot = localState.slotBookings.find(
      (b) =>
        b.restaurantId === orderData.restaurantId &&
        b.date === orderData.pickupSlot.date &&
        b.timeSlot === orderData.pickupSlot.time
    );
    slotBooked = existingSlot ? existingSlot.currentBookings : 0;
  }

  if (slotBooked >= maxCap) {
    throw new Error(`The selected pickup slot (${orderData.pickupSlot.formattedLabel}) is fully booked. Please choose another time slot.`);
  }

  // Increment slot booking atomically
  if (isMongoConnected) {
    await PickupSlotBookingModel.findOneAndUpdate(
      {
        restaurantId: orderData.restaurantId,
        date: orderData.pickupSlot.date,
        timeSlot: orderData.pickupSlot.time,
      },
      {
        $inc: { currentBookings: 1 },
        $setOnInsert: { maxCapacity: maxCap },
      },
      { upsert: true }
    );
  } else {
    let slot = localState.slotBookings.find(
      (b) =>
        b.restaurantId === orderData.restaurantId &&
        b.date === orderData.pickupSlot.date &&
        b.timeSlot === orderData.pickupSlot.time
    );
    if (!slot) {
      slot = {
        restaurantId: orderData.restaurantId,
        date: orderData.pickupSlot.date,
        timeSlot: orderData.pickupSlot.time,
        currentBookings: 1,
        maxCapacity: maxCap,
      };
      localState.slotBookings.push(slot);
    } else {
      slot.currentBookings += 1;
    }
  }

  const tax = Math.round(subtotal * 0.05); // 5% standard canteen tax
  const totalAmount = subtotal + tax;

  const timestamp = new Date().toISOString();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `QL-${Date.now().toString().slice(-4)}${randomSuffix}`;

  const newOrder: IOrder = {
    _id: `ord_${Date.now()}_${randomSuffix}`,
    orderNumber,
    customerUserId: orderData.customerUserId,
    customerName: orderData.customerName,
    customerRole: orderData.customerRole,
    customerPhone: orderData.customerPhone,
    restaurantId: orderData.restaurantId,
    restaurantName: restaurant.name,
    items: orderItems,
    subtotal,
    tax,
    totalAmount,
    pickupSlot: orderData.pickupSlot,
    orderStatus: 'awaiting_acceptance', // Initial status
    paymentStatus: orderData.paymentStatus,
    paymentMethod: orderData.paymentMethod,
    paymentTransactionId: orderData.paymentTransactionId,
    specialInstructions: orderData.specialInstructions || '',
    statusHistory: [
      {
        status: 'awaiting_acceptance',
        timestamp,
        note: 'Order submitted. Awaiting acceptance from restaurant kitchen.',
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Payment record
  const paymentRecord: IPaymentRecord = {
    _id: `pay_${Date.now()}_${randomSuffix}`,
    orderId: newOrder._id!,
    orderNumber: newOrder.orderNumber,
    userId: orderData.customerUserId,
    amount: totalAmount,
    paymentMethod: orderData.paymentMethod,
    status: orderData.paymentStatus,
    transactionReference: orderData.paymentTransactionId || `DEMO_CTR_${randomSuffix}`,
    paidAt: orderData.paymentStatus === 'paid' ? timestamp : undefined,
    createdAt: timestamp,
  };

  if (isMongoConnected) {
    await OrderModel.create(newOrder);
    await PaymentRecordModel.create(paymentRecord);
  } else {
    localState.orders.unshift(newOrder);
    localState.payments.unshift(paymentRecord);
    saveLocalState();
  }

  return newOrder;
}

export async function getCustomerOrders(userId: string): Promise<IOrder[]> {
  if (isMongoConnected) {
    const docs = await OrderModel.find({ customerUserId: userId }).sort({ createdAt: -1 }).lean();
    return docs as unknown as IOrder[];
  }
  return localState.orders
    .filter((o) => o.customerUserId === userId)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function getRestaurantOrders(restaurantId: string): Promise<IOrder[]> {
  if (isMongoConnected) {
    const docs = await OrderModel.find({ restaurantId }).sort({ createdAt: -1 }).lean();
    return docs as unknown as IOrder[];
  }
  return localState.orders
    .filter((o) => o.restaurantId === restaurantId)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function getOrderById(orderId: string): Promise<IOrder | null> {
  if (isMongoConnected) {
    const doc = await OrderModel.findOne({
      $or: [{ _id: orderId }, { orderNumber: orderId }],
    }).lean();
    return doc as unknown as IOrder;
  }
  const order = localState.orders.find((o) => o._id === orderId || o.orderNumber === orderId);
  return order ? { ...order } : null;
}

// STRICT ORDER STATUS TRANSITIONS (Requirement Section 14)
export async function updateOrderStatus(
  orderId: string,
  restaurantId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<IOrder> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('Order not found');

  if (order.restaurantId !== restaurantId) {
    throw new Error('Unauthorized: You do not manage the restaurant for this order');
  }

  const currentStatus = order.orderStatus;
  const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
    awaiting_acceptance: ['accepted', 'rejected'],
    accepted: ['preparing', 'cancelled'],
    preparing: ['ready_for_pickup', 'cancelled'],
    ready_for_pickup: ['completed'],
    completed: [],
    rejected: [],
    cancelled: [],
  };

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition from "${currentStatus}" to "${newStatus}". Order workflow: Awaiting Acceptance -> Accepted -> Preparing -> Ready for Pickup -> Completed.`
    );
  }

  const timestamp = new Date().toISOString();
  const transitionEntry = {
    status: newStatus,
    timestamp,
    note: note || `Status updated to ${newStatus.replace(/_/g, ' ')}`,
  };

  if (isMongoConnected) {
    const updated = await OrderModel.findOneAndUpdate(
      { _id: order._id },
      {
        $set: { orderStatus: newStatus, updatedAt: timestamp },
        $push: { statusHistory: transitionEntry },
      },
      { new: true }
    ).lean();
    return updated as unknown as IOrder;
  }

  const idx = localState.orders.findIndex((o) => o._id === order._id);
  localState.orders[idx].orderStatus = newStatus;
  localState.orders[idx].updatedAt = timestamp;
  localState.orders[idx].statusHistory.push(transitionEntry);
  saveLocalState();

  return { ...localState.orders[idx] };
}

export async function updateOrderPaymentStatus(
  orderId: string,
  restaurantId: string,
  paymentStatus: PaymentStatus
): Promise<IOrder> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('Order not found');

  if (order.restaurantId !== restaurantId) {
    throw new Error('Unauthorized: You do not manage this restaurant');
  }

  const timestamp = new Date().toISOString();

  if (isMongoConnected) {
    const updated = await OrderModel.findOneAndUpdate(
      { _id: order._id },
      { $set: { paymentStatus, updatedAt: timestamp } },
      { new: true }
    ).lean();
    await PaymentRecordModel.findOneAndUpdate(
      { orderId: order._id },
      { $set: { status: paymentStatus, paidAt: paymentStatus === 'paid' ? timestamp : undefined } }
    );
    return updated as unknown as IOrder;
  }

  const idx = localState.orders.findIndex((o) => o._id === order._id);
  localState.orders[idx].paymentStatus = paymentStatus;
  localState.orders[idx].updatedAt = timestamp;

  const payIdx = localState.payments.findIndex((p) => p.orderId === order._id);
  if (payIdx !== -1) {
    localState.payments[payIdx].status = paymentStatus;
    if (paymentStatus === 'paid') {
      localState.payments[payIdx].paidAt = timestamp;
    }
  }

  saveLocalState();
  return { ...localState.orders[idx] };
}
