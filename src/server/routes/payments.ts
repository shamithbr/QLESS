import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

// POST process demo payment
router.post('/process-demo', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { amount, restaurantName, simulateFailure } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Valid payment amount is required' });
      return;
    }

    // Explicit simulated failure option for testing
    if (simulateFailure === true) {
      res.status(402).json({
        success: false,
        status: 'failed',
        error: 'Demo Payment Declined: Card simulation simulated an insufficient funds / declined bank response.',
        transactionReference: `DEMO_FAIL_${Date.now()}`,
      });
      return;
    }

    // Simulated successful demo payment
    const timestamp = new Date().toISOString();
    const transactionReference = `DEMO_TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    res.json({
      success: true,
      status: 'paid',
      isDemo: true,
      disclaimer: 'DEMO PAYMENT SIMULATION ONLY - NO REAL MONEY WAS CHARGED OR TRANSFERRED',
      transactionReference,
      amount: numAmount,
      restaurantName: restaurantName || 'Campus Canteen',
      paidAt: timestamp,
      paymentMethod: 'UPI / Card (Demo Gateway)',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Demo payment processing failed' });
  }
});

export default router;
