import { Request, Response } from 'express'
import { getStripe } from '../config/stripe'
import Enrollment from '../models/Enrollment'
import Subscription from '../models/Subscription'
import User from '../models/User'

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = Array.isArray(req.headers['stripe-signature'])
    ? req.headers['stripe-signature'][0]
    : req.headers['stripe-signature']

  if (!sig) {
    res.status(400).json({ message: 'Falta la firma del webhook' })
    return
  }

  const stripe = getStripe() // ← instancia al inicio, usada en todo el archivo
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    )
  } catch (err) {
    res.status(400).json({ message: `Webhook error: ${(err as Error).message}` })
    return
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as any
      const { userId, courseId, type } = session.metadata

      if (type === 'course_purchase' && courseId) {
        await Enrollment.findOneAndUpdate(
          { student: userId, course: courseId },
          {
            student: userId,
            course: courseId,
            type: 'purchase',
            stripePaymentIntentId: session.payment_intent,
            status: 'active'
          },
          { upsert: true, new: true }
        )
      }

      if (type === 'subscription') {
        await User.findByIdAndUpdate(userId, {
          stripeCustomerId: session.customer
        })
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as any

      if (invoice.subscription) {
        const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription) // ← getStripe() con ()
        const userId = stripeSubscription.metadata?.userId

        if (userId) {
          await Subscription.findOneAndUpdate(
            { student: userId },
            {
              student: userId,
              stripeSubscriptionId: stripeSubscription.id,
              stripeCustomerId: stripeSubscription.customer as string,
              status: 'active',
              currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
              currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
            },
            { upsert: true, new: true }
          )
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as any

      if (invoice.subscription) {
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: invoice.subscription },
          { status: 'past_due' }
        )
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any

      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { status: 'cancelled' }
      )
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as any

      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        {
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        }
      )
      break
    }

    default:
      break
  }

  res.json({ received: true })
}