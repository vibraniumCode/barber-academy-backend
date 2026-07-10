import { Router } from 'express'
import {
  createCourseCheckout,
  createSubscriptionCheckout,
  cancelSubscription,
  verifyCheckoutSession,
  getMyPayments
} from '../controllers/payment.controller'
import { handleWebhook } from '../controllers/webhook.controller'
import { protect } from '../middlewares/auth.middleware'
import express from 'express'

const router = Router()

// ── WEBHOOK ──────────────────────────────────────────────────
// IMPORTANTE: esta ruta va ANTES del express.json() middleware
// porque necesita el body RAW (sin parsear) para verificar la firma de Stripe
// Por eso la definimos acá con express.raw() específicamente para esta ruta
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // body RAW para verificación de firma
  handleWebhook
)

// ── CHECKOUT ──────────────────────────────────────────────────
router.post('/checkout/course/:courseId', protect, createCourseCheckout)
router.post('/checkout/subscription', protect, createSubscriptionCheckout)
router.get('/checkout/verify/:sessionId', protect, verifyCheckoutSession)

// ── SUSCRIPCIÓN ──────────────────────────────────────────────
router.post('/subscription/cancel', protect, cancelSubscription)

// ── HISTORIAL ──────────────────────────────────────────────────
router.get('/my-payments', protect, getMyPayments)

export default router