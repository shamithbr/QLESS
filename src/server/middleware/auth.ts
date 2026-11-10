import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findUserByUserId } from '../db/store.ts';
import { IUser } from '../db/schema.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'qless-college-canteen-secure-secret-2026';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export function generateToken(user: IUser): string {
  return jwt.sign(
    {
      userId: user.userId,
      role: user.role,
      restaurantId: user.restaurantId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    const user = await findUserByUserId(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User account not found or has been deactivated.' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}

export function requireRestaurantOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'restaurant_owner') {
    res.status(403).json({ error: 'Access denied: Restaurant owner privileges required.' });
    return;
  }
  next();
}
