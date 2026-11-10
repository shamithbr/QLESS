import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'student' | 'faculty' | 'restaurant_owner';

export interface IUser {
  _id?: string;
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone: string;
  department?: string;
  restaurantId?: string;
  createdAt?: Date;
}

export interface IRestaurant {
  _id?: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  coverImage: string;
  foodImages: string[];
  foodCategories: string[];
  openingTime: string; // "08:00"
  closingTime: string; // "20:30"
  slotIntervalMinutes: number; // e.g. 15
  maxOrdersPerSlot: number; // e.g. 10
  leadTimeMinutes: number; // e.g. 15
  isOpen: boolean;
  ownerUserId: string;
  createdAt?: Date;
}

export interface IFoodItem {
  _id?: string;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  foodImage: string;
  isAvailable: boolean;
  isVeg: boolean;
  createdAt?: Date;
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

export interface IOrderItem {
  foodItemId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg?: boolean;
}

export interface IStatusTransition {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface IPickupSlotDetail {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  formattedLabel: string; // e.g. "Today at 01:15 PM"
}

export interface IOrder {
  _id?: string;
  orderNumber: string;
  customerUserId: string;
  customerName: string;
  customerRole: 'student' | 'faculty';
  customerPhone: string;
  restaurantId: string;
  restaurantName: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  pickupSlot: IPickupSlotDetail;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentTransactionId?: string;
  specialInstructions?: string;
  statusHistory: IStatusTransition[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IPaymentRecord {
  _id?: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string;
  paidAt?: string;
  createdAt: string;
}

export interface IPickupSlotBooking {
  _id?: string;
  restaurantId: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm
  currentBookings: number;
  maxCapacity: number;
}

// Mongoose Schemas (for MongoDB Atlas connectivity)
export const UserSchema = new Schema<IUser>({
  userId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'faculty', 'restaurant_owner'], required: true },
  phone: { type: String, required: true },
  department: { type: String },
  restaurantId: { type: String },
}, { timestamps: true });

export const RestaurantSchema = new Schema<IRestaurant>({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  tagline: { type: String, default: '' },
  description: { type: String, required: true },
  coverImage: { type: String, required: true },
  foodImages: [{ type: String }],
  foodCategories: [{ type: String }],
  openingTime: { type: String, default: '08:30' },
  closingTime: { type: String, default: '20:30' },
  slotIntervalMinutes: { type: Number, default: 15 },
  maxOrdersPerSlot: { type: Number, default: 10 },
  leadTimeMinutes: { type: Number, default: 15 },
  isOpen: { type: Boolean, default: true },
  ownerUserId: { type: String, required: true, index: true },
}, { timestamps: true });

export const FoodItemSchema = new Schema<IFoodItem>({
  restaurantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  foodImage: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
  isVeg: { type: Boolean, default: true },
}, { timestamps: true });

export const OrderSchema = new Schema<IOrder>({
  orderNumber: { type: String, required: true, unique: true, index: true },
  customerUserId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerRole: { type: String, enum: ['student', 'faculty'], required: true },
  customerPhone: { type: String, required: true },
  restaurantId: { type: String, required: true, index: true },
  restaurantName: { type: String, required: true },
  items: [{
    foodItemId: String,
    name: String,
    price: Number,
    quantity: Number,
    isVeg: Boolean,
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  pickupSlot: {
    date: { type: String, required: true },
    time: { type: String, required: true },
    formattedLabel: { type: String, required: true },
  },
  orderStatus: {
    type: String,
    enum: ['awaiting_acceptance', 'accepted', 'preparing', 'ready_for_pickup', 'completed', 'rejected', 'cancelled'],
    default: 'awaiting_acceptance',
    index: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
    index: true,
  },
  paymentMethod: {
    type: String,
    enum: ['online_demo', 'pay_at_counter'],
    required: true,
  },
  paymentTransactionId: { type: String },
  specialInstructions: { type: String },
  statusHistory: [{
    status: String,
    timestamp: String,
    note: String,
  }],
}, { timestamps: true });

export const PaymentRecordSchema = new Schema<IPaymentRecord>({
  orderId: { type: String, required: true, index: true },
  orderNumber: { type: String, required: true },
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  status: { type: String, required: true },
  transactionReference: { type: String, required: true },
  paidAt: { type: String },
}, { timestamps: true });

export const PickupSlotBookingSchema = new Schema<IPickupSlotBooking>({
  restaurantId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  timeSlot: { type: String, required: true },
  currentBookings: { type: Number, default: 0 },
  maxCapacity: { type: Number, default: 10 },
}, { timestamps: true });
