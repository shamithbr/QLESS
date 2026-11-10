import { Router, Request, Response } from 'express';
import {
  getFoodItemsByRestaurant,
  getAllFoodItems,
  updateFoodItemAvailability,
  updateFoodItemPrice,
  addFoodItem,
} from '../db/store.ts';
import { requireAuth, requireRestaurantOwner, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

// GET food items (filtered by restaurant or search term)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = req.query.restaurantId as string | undefined;
    const query = req.query.q as string | undefined;
    const category = req.query.category as string | undefined;

    let items = restaurantId
      ? await getFoodItemsByRestaurant(restaurantId)
      : await getAllFoodItems();

    if (category && category !== 'All') {
      items = items.filter((item) => item.category.toLowerCase() === category.toLowerCase());
    }

    if (query && query.trim().length > 0) {
      const q = query.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: items.length, foodItems: items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch menu items' });
  }
});

// PATCH food availability (Owner only)
router.patch(
  '/:id/availability',
  requireAuth,
  requireRestaurantOwner,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { isAvailable } = req.body;
      const owner = req.user!;
      if (!owner.restaurantId) {
        res.status(403).json({ error: 'No restaurant linked to this owner account' });
        return;
      }

      if (typeof isAvailable !== 'boolean') {
        res.status(400).json({ error: 'isAvailable must be a boolean (true/false)' });
        return;
      }

      const updated = await updateFoodItemAvailability(req.params.id, owner.restaurantId, isAvailable);
      if (!updated) {
        res.status(404).json({ error: 'Food item not found or does not belong to your restaurant' });
        return;
      }

      res.json({ success: true, foodItem: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update food availability' });
    }
  }
);

// PATCH food price (Owner only)
router.patch(
  '/:id/price',
  requireAuth,
  requireRestaurantOwner,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { price } = req.body;
      const owner = req.user!;
      if (!owner.restaurantId) {
        res.status(403).json({ error: 'No restaurant linked to this owner account' });
        return;
      }

      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        res.status(400).json({ error: 'Price must be a valid positive number' });
        return;
      }

      const updated = await updateFoodItemPrice(req.params.id, owner.restaurantId, Math.round(numPrice));
      if (!updated) {
        res.status(404).json({ error: 'Food item not found or does not belong to your restaurant' });
        return;
      }

      res.json({ success: true, foodItem: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update food price' });
    }
  }
);

// POST add new food item (Owner only)
router.post(
  '/',
  requireAuth,
  requireRestaurantOwner,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const owner = req.user!;
      if (!owner.restaurantId) {
        res.status(403).json({ error: 'No restaurant linked to this owner account' });
        return;
      }

      const { name, description, category, price, foodImage, isVeg, isAvailable } = req.body;

      if (!name || !description || !category || price === undefined) {
        res.status(400).json({ error: 'Please provide item name, description, category, and price.' });
        return;
      }

      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        res.status(400).json({ error: 'Price must be a positive number' });
        return;
      }

      const newItem = await addFoodItem(owner.restaurantId, {
        name: String(name).trim(),
        description: String(description).trim(),
        category: String(category).trim(),
        price: Math.round(numPrice),
        foodImage: foodImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
        isVeg: isVeg !== false,
        isAvailable: isAvailable !== false,
      });

      res.status(201).json({ success: true, foodItem: newItem });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to add food item' });
    }
  }
);

export default router;
