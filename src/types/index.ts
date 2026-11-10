export type UserRole = 'student' | 'faculty' | 'restaurant_owner';

export interface User {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  department?: string;
  restaurantId?: string;
  assignedRestaurant?: Restaurant;
}

export interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  coverImage: string;
  foodImages: string[];
  foodCategories: string[];
  openingTime: string;
  closingTime: string;
  slotIntervalMinutes: number;
  maxOrdersPerSlot: number;
  leadTimeMinutes: number;
  isOpen: boolean;
  ownerUserId: string;
}

export interface FoodItem {
  _id: string;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  foodImage: string;
  isAvailable: boolean;
  isVeg: boolean;
}

export type OrderStatus =
  | 'awaiting_acceptance'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type PaymentMethod = 'online_demo' | 'pay_at_counter';

export interface OrderItem {
  foodItemId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg?: boolean;
}

export interface StatusTransition {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface PickupSlot {
  date: string;
  time: string;
  formattedLabel: string;
  isAvailable?: boolean;
  bookedCount?: number;
  maxCapacity?: number;
  reason?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerUserId: string;
  customerName: string;
  customerRole: 'student' | 'faculty';
  customerPhone: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  pickupSlot: PickupSlot;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentTransactionId?: string;
  specialInstructions?: string;
  statusHistory: StatusTransition[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  foodItem: FoodItem;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
}
