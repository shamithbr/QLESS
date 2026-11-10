import {
  User,
  Restaurant,
  FoodItem,
  Order,
  PickupSlot,
  OrderStatus,
  PaymentStatus,
} from '../types/index.ts';

const TOKEN_KEY = 'qless_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: async (identifier: string, password: string) => {
    return request<{ success: boolean; token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },

  getCurrentUser: async () => {
    return request<{ user: User }>('/api/auth/me');
  },

  forgotPassword: async (identifier: string) => {
    return request<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  // Restaurants
  getRestaurants: async () => {
    return request<{ success: boolean; count: number; restaurants: Restaurant[] }>('/api/restaurants');
  },

  getRestaurant: async (id: string) => {
    return request<{ success: boolean; restaurant: Restaurant }>(`/api/restaurants/${id}`);
  },

  getPickupSlots: async (restaurantId: string, date?: string) => {
    const url = date
      ? `/api/restaurants/${restaurantId}/slots?date=${encodeURIComponent(date)}`
      : `/api/restaurants/${restaurantId}/slots`;
    return request<{ success: boolean; slots: PickupSlot[] }>(url);
  },

  // Food
  getFoodItems: async (params?: { restaurantId?: string; category?: string; q?: string }) => {
    const query = new URLSearchParams();
    if (params?.restaurantId) query.set('restaurantId', params.restaurantId);
    if (params?.category) query.set('category', params.category);
    if (params?.q) query.set('q', params.q);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<{ success: boolean; count: number; foodItems: FoodItem[] }>(`/api/food${queryString}`);
  },

  updateFoodAvailability: async (foodItemId: string, isAvailable: boolean) => {
    return request<{ success: boolean; foodItem: FoodItem }>(`/api/food/${foodItemId}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    });
  },

  updateFoodPrice: async (foodItemId: string, price: number) => {
    return request<{ success: boolean; foodItem: FoodItem }>(`/api/food/${foodItemId}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ price }),
    });
  },

  addFoodItem: async (itemData: {
    name: string;
    description: string;
    category: string;
    price: number;
    foodImage?: string;
    isVeg?: boolean;
    isAvailable?: boolean;
  }) => {
    return request<{ success: boolean; foodItem: FoodItem }>('/api/food', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  // Orders
  createOrder: async (orderPayload: {
    restaurantId: string;
    items: { foodItemId: string; quantity: number }[];
    pickupSlot: { date: string; time: string; formattedLabel: string };
    paymentMethod: 'online_demo' | 'pay_at_counter';
    paymentStatus?: 'pending' | 'paid';
    paymentTransactionId?: string;
    specialInstructions?: string;
  }) => {
    return request<{ success: boolean; order: Order }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });
  },

  getMyOrders: async () => {
    return request<{ success: boolean; count: number; orders: Order[] }>('/api/orders/my-orders');
  },

  getRestaurantOrders: async (restaurantId: string) => {
    return request<{ success: boolean; count: number; orders: Order[] }>(`/api/orders/restaurant/${restaurantId}`);
  },

  getOrderById: async (orderId: string) => {
    return request<{ success: boolean; order: Order }>(`/api/orders/${orderId}`);
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus, note?: string) => {
    return request<{ success: boolean; order: Order }>(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  },

  updateOrderPayment: async (orderId: string, paymentStatus: PaymentStatus) => {
    return request<{ success: boolean; order: Order }>(`/api/orders/${orderId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus }),
    });
  },

  // Payment simulation
  processDemoPayment: async (payload: {
    amount: number;
    restaurantName: string;
    simulateFailure?: boolean;
  }) => {
    return request<{
      success: boolean;
      status: string;
      transactionReference: string;
      amount: number;
      restaurantName: string;
      paidAt: string;
    }>('/api/payments/process-demo', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
