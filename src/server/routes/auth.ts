import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { findUserByIdentifier, findUserByUserId, getRestaurantById } from '../db/store.ts';
import { generateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ error: 'Please enter your User ID or Email, and Password.' });
      return;
    }

    const cleanIdentifier = String(identifier).trim();
    const user = await findUserByIdentifier(cleanIdentifier);

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials. Please verify your User ID/Email and password.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials. Please check your password.' });
      return;
    }

    const token = generateToken(user);

    // If owner, fetch assigned restaurant details
    let assignedRestaurant = null;
    if (user.role === 'restaurant_owner' && user.restaurantId) {
      assignedRestaurant = await getRestaurantById(user.restaurantId);
    }

    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        restaurantId: user.restaurantId,
        assignedRestaurant,
      },
    });
  } catch (err: any) {
    console.error('[AUTH LOGIN ERROR]', err);
    res.status(500).json({ error: 'An unexpected server error occurred during login. Please try again.' });
  }
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let assignedRestaurant = null;
    if (user.role === 'restaurant_owner' && user.restaurantId) {
      assignedRestaurant = await getRestaurantById(user.restaurantId);
    }

    res.json({
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        restaurantId: user.restaurantId,
        assignedRestaurant,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load user profile' });
  }
});

router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { identifier } = req.body;
  if (!identifier) {
    res.status(400).json({ error: 'Please provide your registered User ID or campus email.' });
    return;
  }

  const user = await findUserByIdentifier(String(identifier).trim());
  if (!user) {
    res.status(404).json({ error: 'No account found matching this User ID or Email.' });
    return;
  }

  // Simulated password reset instruction
  res.json({
    success: true,
    message: `Password reset verification has been initiated for User ID ${user.userId}. In development mode, the default password is Qless@123. In production, an authorized OTP is dispatched to your registered department email (${user.email}).`,
  });
});

export default router;
