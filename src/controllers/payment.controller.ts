import { Response } from 'express'
import { AuthRequest } from '../types'
import { getStripe } from '../config/stripe'
import Course from '../models/Course'
import Enrollment from '../models/Enrollment'
import Subscription from '../models/Subscription'
import User from '../models/User'

// ── PAGO ÚNICO POR CURSO ──────────────────────────────────────

// POST /api/payments/checkout/course/:courseId
// Crea una sesión de pago de Stripe para comprar un curso específico
//
// ¿Cómo funciona Stripe Checkout?
// 1. Nuestro servidor le pide a Stripe que cree una "sesión de pago"
// 2. Stripe nos devuelve una URL de checkout (alojada en los servidores de Stripe)
// 3. Redirigimos al usuario a esa URL — Stripe se encarga de todo el formulario de pago
// 4. Cuando el pago termina (exitoso o cancelado), Stripe redirige al usuario de vuelta a nuestra web
// 5. Stripe también nos notifica via webhook (evento payment_intent.succeeded)
// Esta arquitectura es más segura porque los datos de tarjeta NUNCA pasan por nuestro servidor
export const createCourseCheckout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findById(req.params.courseId)
    if (!course) {
      res.status(404).json({ message: 'Curso no encontrado' })
      return
    }

    // Verificamos que el estudiante no haya comprado este curso antes
    const existingEnrollment = await Enrollment.findOne({
      student: req.user?._id,
      course: course._id,
      status: 'active'
    })
    if (existingEnrollment) {
      res.status(400).json({ message: 'Ya tenés acceso a este curso' })
      return
    }

    // Buscamos o creamos el cliente en Stripe
    // Stripe guarda el historial de pagos por cliente — es importante mantenerlo consistente
    let stripeCustomerId = req.user?.stripeCustomerId
    const stripe = getStripe()

    if (!stripeCustomerId) {
      // Si el usuario no tiene cliente en Stripe, lo creamos
      const customer = await stripe.customers.create({
        email: req.user?.email,
        name: req.user?.name,
        metadata: { userId: req.user?._id.toString() as string }
      })
      stripeCustomerId = customer.id

      // Guardamos el ID del cliente de Stripe en nuestro usuario
      await User.findByIdAndUpdate(req.user?._id, { stripeCustomerId })
    }

    // Creamos la sesión de checkout de Stripe
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'payment', // pago único (no recurrente)
      line_items: [
        {
          price_data: {
            currency: course.currency.toLowerCase(),
            product_data: {
              name: course.title,
              description: course.shortDescription,
              images: course.thumbnail ? [course.thumbnail] : []
            },
            unit_amount: Math.round(course.price * 100) // Stripe maneja centavos, no dólares
          },
          quantity: 1
        }
      ],
      // URLs de redirección después del pago
      // {CHECKOUT_SESSION_ID} es un placeholder que Stripe reemplaza automáticamente
      success_url: `${process.env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/courses/${course.slug}`,
      metadata: {
        // Guardamos info extra para usarla en el webhook
        courseId: course._id.toString(),
        userId: req.user?._id.toString() as string,
        type: 'course_purchase'
      }
    })

    // Devolvemos la URL de checkout al frontend para redirigir al usuario
    res.json({ checkoutUrl: session.url, sessionId: session.id })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// ── SUSCRIPCIÓN MENSUAL ──────────────────────────────────────

// POST /api/payments/checkout/subscription
// Crea una sesión de pago para suscripción mensual
// La suscripción da acceso a TODOS los cursos mientras esté activa
export const createSubscriptionCheckout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Verificamos que no tenga ya una suscripción activa
    const existingSub = await Subscription.findOne({
      student: req.user?._id,
      status: 'active'
    })
    if (existingSub) {
      res.status(400).json({ message: 'Ya tenés una suscripción activa' })
      return
    }

    // Buscamos o creamos el cliente en Stripe (igual que en el checkout de curso)
    let stripeCustomerId = req.user?.stripeCustomerId
    const stripe = getStripe()
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.user?.email,
        name: req.user?.name,
        metadata: { userId: req.user?._id.toString() as string }
      })
      stripeCustomerId = customer.id
      await User.findByIdAndUpdate(req.user?._id, { stripeCustomerId })
    }

    // Para suscripciones necesitamos un Price ID de Stripe
    // Este Price ID lo creamos en el dashboard de Stripe (un producto recurrente mensual)
    // Lo buscamos en las variables de entorno
    if (!process.env.STRIPE_SUBSCRIPTION_PRICE_ID) {
      res.status(500).json({ message: 'Precio de suscripción no configurado' })
      return
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription', // pago recurrente mensual
      line_items: [
        {
          price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID, // el Price ID del plan mensual
          quantity: 1
        }
      ],
      success_url: `${process.env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/pricing`,
      metadata: {
        userId: req.user?._id.toString() as string,
        type: 'subscription'
      }
    })

    res.json({ checkoutUrl: session.url, sessionId: session.id })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// ── CANCELAR SUSCRIPCIÓN ──────────────────────────────────────

// POST /api/payments/subscription/cancel
// Cancela la suscripción al final del período actual
// (el usuario mantiene el acceso hasta que vence el período que ya pagó)
export const cancelSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subscription = await Subscription.findOne({
      student: req.user?._id,
      status: 'active'
    })

    if (!subscription) {
      res.status(404).json({ message: 'No tenés una suscripción activa' })
      return
    }
    const stripe = getStripe()
    // cancelAtPeriodEnd: true → Stripe no cobra el próximo mes pero mantiene acceso hasta que vence
    // Es más amigable que cancelar inmediatamente
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    })

    subscription.cancelAtPeriodEnd = true
    await subscription.save()

    res.json({
      message: 'Suscripción cancelada. Mantenés el acceso hasta el fin del período actual.',
      subscription
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// ── VERIFICAR SESIÓN DE CHECKOUT ──────────────────────────────

// GET /api/payments/checkout/verify/:sessionId
// El frontend llama a esto después de que Stripe redirige al usuario a la URL de éxito
// Verificamos que el pago realmente se completó (no alcanza con llegar a la URL de éxito)
export const verifyCheckoutSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stripe = getStripe()
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      res.status(400).json({ message: 'El pago no se completó' })
      return
    }

    res.json({
      status: session.payment_status,
      type: session.metadata?.type,
      courseId: session.metadata?.courseId || null
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// ── ESTADO DE PAGOS DEL USUARIO ──────────────────────────────

// GET /api/payments/my-payments
// Historial de compras y estado de suscripción del usuario logueado
export const getMyPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Cursos comprados individualmente
    const enrollments = await Enrollment.find({
      student: req.user?._id,
      type: 'purchase',
      status: 'active'
    }).populate('course', 'title slug thumbnail price')

    // Estado de suscripción
    const subscription = await Subscription.findOne({ student: req.user?._id })

    res.json({ enrollments, subscription })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}