import { Request, Response } from 'express';
import Stripe from 'stripe';
import { ObjectId } from 'mongodb';
import { getCollections } from '../config/db';
import { ENV } from '../config/env';
import { AuthenticatedRequest } from '../middleware/auth';
import { IPayment, IUser } from '../models/types';

const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia' as any
});

export const createCheckoutSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { planType } = req.body; // 'pro_student' or 'pro_tutor'
    const isTutor = req.user.role === 'tutor' || planType === 'pro_tutor';
    const amount = isTutor ? ENV.PRO_TUTOR_PRICE : ENV.PRO_STUDENT_PRICE;
    const planName = isTutor ? 'Pro Tutor Plan' : 'Pro Student Plan';

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `MentorLagbe - ${planName}`,
              description: isTutor
                ? 'Unlimited tuition postings, verified badge, top search placement.'
                : 'Priority application review, direct tutor messaging, premium badge.'
            },
            unit_amount: amount * 100 // Stripe expects amounts in cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      customer_email: req.user.email,
      client_reference_id: req.user.userId,
      metadata: {
        userId: req.user.userId,
        userEmail: req.user.email,
        userName: req.user.name,
        userRole: req.user.role,
        planName
      },
      success_url: `${ENV.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ENV.CLIENT_URL}/payment/cancel`
    });

    res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id
    });
  } catch (error: any) {
    console.error('[PaymentController.createCheckoutSession] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Stripe checkout session.',
      error: error.message
    });
  }
};

export const verifySession = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.query.sessionId as string;

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ success: false, message: 'Session ID is required.' });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      res.status(400).json({
        success: false,
        message: 'Payment has not been completed.'
      });
      return;
    }

    const { users, payments } = getCollections();
    const userEmail = session.customer_email || session.metadata?.userEmail;
    const planName = session.metadata?.planName || 'Pro Plan';
    const amount = (session.amount_total || 0) / 100;
    const currency = session.currency?.toUpperCase() || 'USD';

    if (!userEmail) {
      res.status(400).json({ success: false, message: 'User email not found on session.' });
      return;
    }

    // Check if payment already recorded
    let paymentRecord = await payments.findOne({ stripeSessionId: sessionId });

    if (!paymentRecord) {
      const user = (await users.findOne({ email: userEmail })) as IUser | null;

      const newPayment: IPayment = {
        userEmail,
        userName: user?.name || session.metadata?.userName || 'MentorLagbe User',
        userRole: user?.role || (session.metadata?.userRole as any) || 'student',
        planName,
        amount,
        currency,
        transactionId: (session.payment_intent as string) || `txn_${Date.now()}`,
        stripeSessionId: sessionId,
        paymentStatus: 'paid',
        paidAt: new Date()
      };

      await payments.insertOne(newPayment as any);
      paymentRecord = newPayment as any;

      // Update user plan to 'pro'
      await users.updateOne(
        { email: userEmail },
        { $set: { plan: 'pro', updatedAt: new Date() } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and Pro status activated successfully!',
      data: paymentRecord
    });
  } catch (error: any) {
    console.error('[PaymentController.verifySession] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify session.',
      error: error.message
    });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;

  try {
    if (ENV.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, ENV.STRIPE_WEBHOOK_SECRET);
    } else {
      // In local dev without secret, parse body directly
      event = req.body;
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userEmail = session.customer_email || session.metadata?.userEmail;

    if (userEmail) {
      try {
        const { users, payments } = getCollections();
        const existing = await payments.findOne({ stripeSessionId: session.id });

        if (!existing) {
          const user = await users.findOne({ email: userEmail });
          const newPayment: IPayment = {
            userEmail,
            userName: user?.name || session.metadata?.userName || 'User',
            userRole: user?.role || (session.metadata?.userRole as any) || 'student',
            planName: session.metadata?.planName || 'Pro Plan',
            amount: (session.amount_total || 0) / 100,
            currency: (session.currency || 'usd').toUpperCase(),
            transactionId: (session.payment_intent as string) || `txn_${Date.now()}`,
            stripeSessionId: session.id,
            paymentStatus: 'paid',
            paidAt: new Date()
          };

          await payments.insertOne(newPayment as any);
          await users.updateOne(
            { email: userEmail },
            { $set: { plan: 'pro', updatedAt: new Date() } }
          );
          console.log(`[Stripe Webhook] Upgraded user ${userEmail} to Pro.`);
        }
      } catch (dbErr) {
        console.error('[Stripe Webhook] DB Error:', dbErr);
      }
    }
  }

  res.status(200).json({ received: true });
};

export const getAdminTransactions = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { payments } = getCollections();
    const items = await payments
      .find({})
      .sort({ paidAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error: any) {
    console.error('[PaymentController.getAdminTransactions] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions.',
      error: error.message
    });
  }
};
