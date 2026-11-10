import { Router, Response } from 'express';
import {
  createOrderAtomic,
  getCustomerOrders,
  getRestaurantOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderPaymentStatus,
} from '../db/store.ts';
import { requireAuth, requireRestaurantOwner, AuthenticatedRequest } from '../middleware/auth.ts';
import { OrderStatus, PaymentStatus } from '../db/schema.ts';

const router = Router();

// POST create a new order (Students and Faculty)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (user.role !== 'student' && user.role !== 'faculty') {
      res.status(403).json({ error: 'Only students and faculty can place canteen orders.' });
      return;
    }

    const {
      restaurantId,
      items,
      pickupSlot,
      paymentMethod,
      paymentStatus,
      paymentTransactionId,
      specialInstructions,
    } = req.body;

    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant is required.' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Your cart is empty. Please add items before placing an order.' });
      return;
    }

    if (!pickupSlot || !pickupSlot.time || !pickupSlot.formattedLabel) {
      res.status(400).json({ error: 'Please choose an exact pickup time slot.' });
      return;
    }

    if (!paymentMethod || !['online_demo', 'pay_at_counter'].includes(paymentMethod)) {
      res.status(400).json({ error: 'Invalid payment method selected.' });
      return;
    }

    const initialPaymentStatus: PaymentStatus =
      paymentMethod === 'online_demo' && paymentStatus === 'paid' ? 'paid' : 'pending';

    const order = await createOrderAtomic({
      customerUserId: user.userId,
      customerName: user.name,
      customerRole: user.role,
      customerPhone: user.phone,
      restaurantId,
      items,
      pickupSlot: {
        date: pickupSlot.date || new Date().toISOString().split('T')[0],
        time: pickupSlot.time,
        formattedLabel: pickupSlot.formattedLabel,
      },
      paymentMethod,
      paymentStatus: initialPaymentStatus,
      paymentTransactionId,
      specialInstructions,
    });

    res.status(201).json({ success: true, order });
  } catch (err: any) {
    console.error('[CREATE ORDER ERROR]', err.message);
    res.status(400).json({ error: err.message || 'Failed to place order.' });
  }
});

// GET current customer's active and past orders
router.get('/my-orders', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const orders = await getCustomerOrders(user.userId);
    res.json({ success: true, count: orders.length, orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch your orders' });
  }
});

// GET orders for a restaurant (Owner only - enforces assigned restaurant ownership!)
router.get(
  '/restaurant/:restaurantId',
  requireAuth,
  requireRestaurantOwner,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const owner = req.user!;
      const requestedRestaurantId = req.params.restaurantId;

      if (owner.restaurantId !== requestedRestaurantId) {
        res.status(403).json({
          error: 'Access denied: You are only authorized to view orders for your assigned restaurant.',
        });
        return;
      }

      const orders = await getRestaurantOrders(requestedRestaurantId);
      res.json({ success: true, count: orders.length, orders });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch restaurant orders' });
    }
  }
);

// GET order details
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const order = await getOrderById(req.params.id);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Security check: customer owns the order OR owner owns the restaurant
    const isCustomer = order.customerUserId === user.userId;
    const isRestaurantOwner = user.role === 'restaurant_owner' && user.restaurantId === order.restaurantId;

    if (!isCustomer && !isRestaurantOwner) {
      res.status(403).json({ error: 'Unauthorized to view this order.' });
      return;
    }

    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch order details' });
  }
});

// PATCH order status (Strict lifecycle enforcement - Owner only!)
router.patch(
  '/:id/status',
  requireAuth,
  requireRestaurantOwner,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const owner = req.user!;
      const { status, note } = req.body as { status: OrderStatus; note?: string };

      if (!status) {
        res.status(400).json({ error: 'New status is required.' });
        return;
      }

      if (!owner.restaurantId) {
        res.status(403).json({ error: 'No restaurant associated with this owner account.' });
        return;
      }

      const updatedOrder = await updateOrderStatus(req.params.id, owner.restaurantId, status, note);
      res.json({ success: true, order: updatedOrder });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update order status' });
    }
  }
);

// PATCH mark payment as paid (e.g. for Pay at Counter - Owner only!)
router.patch(
  '/:id/payment',
  requireAuth,
  requireRestaurantOwner,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const owner = req.user!;
      const { paymentStatus } = req.body as { paymentStatus: PaymentStatus };

      if (!paymentStatus || !['paid', 'pending', 'failed'].includes(paymentStatus)) {
        res.status(400).json({ error: 'Invalid payment status' });
        return;
      }

      if (!owner.restaurantId) {
        res.status(403).json({ error: 'No restaurant associated with this owner account.' });
        return;
      }

      const updatedOrder = await updateOrderPaymentStatus(req.params.id, owner.restaurantId, paymentStatus);
      res.json({ success: true, order: updatedOrder });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update payment status' });
    }
  }
);

export default router;
