import { Router, Request, Response } from 'express';
import { getAllRestaurants, getRestaurantById, getAvailablePickupSlots } from '../db/store.ts';

const router = Router();

// GET all 5 restaurants
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const restaurants = await getAllRestaurants();
    res.json({ success: true, count: restaurants.length, restaurants });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch restaurants' });
  }
});

// GET specific restaurant details
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurant = await getRestaurantById(req.params.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }
    res.json({ success: true, restaurant });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch restaurant' });
  }
});

// GET dynamically computed available pickup slots for today or chosen date
router.get('/:id/slots', async (req: Request, res: Response): Promise<void> => {
  try {
    const targetDate = req.query.date as string | undefined;
    const slots = await getAvailablePickupSlots(req.params.id, targetDate);
    res.json({ success: true, slots });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to compute pickup slots' });
  }
});

export default router;
