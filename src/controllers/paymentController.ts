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
    const userRole = req.user.role;

    // Security Check: Admins cannot purchase user plans
    if (userRole === 'admin') {
      res.status(400).json({
        success: false,
        message: 'Administrator accounts cannot purchase membership plans.'
      });
      return;
    }

    // Security Check: Strict role-plan match enforcement
    if (userRole === 'student' && planType !== 'pro_student') {
      res.status(403).json({
        success: false,
        message: 'Role Restriction: Students are only permitted to purchase the Pro Student Plan ($10).'
      });
      return;
    }

    if (userRole === 'tutor' && planType !== 'pro_tutor') {
      res.status(403).json({
        success: false,
        message: 'Role Restriction: Tutors are only permitted to purchase the Pro Tutor Plan ($15).'
      });
      return;
    }

    const { users } = getCollections();
    const dbUser = await users.findOne({ _id: new ObjectId(req.user.userId) });

    if (!dbUser) {
      res.status(404).json({ success: false, message: 'User account not found.' });
      return;
    }

    if (dbUser.plan === 'pro') {
      res.status(400).json({
        success: false,
        message: 'Your account already has an active Pro membership.'
      });
      return;
    }

    const isTutor = userRole === 'tutor';
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
                ? 'Unlimited tuition postings, verified mentor badge, top search placement.'
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
        userRole: userRole,
        planType: isTutor ? 'pro_tutor' : 'pro_student',
        planName: planName
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
    const sessionRole = session.metadata?.userRole;
    const sessionPlanType = session.metadata?.planType;
    const planName = session.metadata?.planName || 'Pro Plan';
    const amount = (session.amount_total || 0) / 100;
    const currency = session.currency?.toUpperCase() || 'USD';

    if (!userEmail) {
      res.status(400).json({ success: false, message: 'User email not found on session.' });
      return;
    }

    const user = (await users.findOne({ email: userEmail })) as IUser | null;
    if (!user) {
      res.status(404).json({ success: false, message: 'User matching checkout session not found.' });
      return;
    }

    // Role Integrity Check: Prevent cross-role plan activation
    if (sessionRole && user.role !== sessionRole) {
      res.status(403).json({
        success: false,
        message: 'Security Violation: Database role does not match session role.'
      });
      return;
    }

    if (user.role === 'tutor' && sessionPlanType !== 'pro_tutor') {
      res.status(403).json({
        success: false,
        message: 'Security Violation: Tutor account cannot be upgraded via a student plan.'
      });
      return;
    }

    if (user.role === 'student' && sessionPlanType !== 'pro_student') {
      res.status(403).json({
        success: false,
        message: 'Security Violation: Student account cannot be upgraded via a tutor plan.'
      });
      return;
    }

    // Check if payment already recorded
    let paymentRecord = await payments.findOne({ stripeSessionId: sessionId });

    if (!paymentRecord) {
      const newPayment: IPayment = {
        userEmail,
        userName: user.name || session.metadata?.userName || 'MentorLagbe User',
        userRole: user.role,
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
    const sessionRole = session.metadata?.userRole;
    const sessionPlanType = session.metadata?.planType;

    if (userEmail) {
      try {
        const { users, payments } = getCollections();
        const existing = await payments.findOne({ stripeSessionId: session.id });

        if (!existing) {
          const user = (await users.findOne({ email: userEmail })) as IUser | null;
          if (user) {
            // Role integrity check in webhook
            if (sessionRole && user.role !== sessionRole) {
              console.error(`[Stripe Webhook] Role mismatch for ${userEmail}: DB=${user.role}, Session=${sessionRole}`);
              res.status(400).json({ error: 'Role mismatch' });
              return;
            }

            if (user.role === 'tutor' && sessionPlanType !== 'pro_tutor') {
              console.error(`[Stripe Webhook] Tutor ${userEmail} attempted student plan activation.`);
              res.status(400).json({ error: 'Invalid plan for tutor' });
              return;
            }

            if (user.role === 'student' && sessionPlanType !== 'pro_student') {
              console.error(`[Stripe Webhook] Student ${userEmail} attempted tutor plan activation.`);
              res.status(400).json({ error: 'Invalid plan for student' });
              return;
            }

            const newPayment: IPayment = {
              userEmail,
              userName: user.name || session.metadata?.userName || 'User',
              userRole: user.role,
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
            console.log(`[Stripe Webhook] Verified and upgraded user ${userEmail} (${user.role}) to Pro.`);
          }
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
