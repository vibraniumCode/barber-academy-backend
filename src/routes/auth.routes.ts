import { Router } from 'express'
import { register, login, getMe, updateProfile, changePassword } from '../controllers/auth.controller'
import { protect } from '../middlewares/auth.middleware'

const router = Router()

// Rutas públicas — no requieren token
router.post('/register', register)
router.post('/login', login)

// Rutas privadas — protect verifica el token antes de llegar al controller
router.get('/me', protect, getMe)
router.patch('/me', protect, updateProfile)
router.patch('/password', protect, changePassword)

export default router