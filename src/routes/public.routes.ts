import { Router } from 'express'
import {
  getPublicCourses,
  getPublicCourseDetail,
  getInstructorProfile,
  getPricing,
  searchCourses
} from '../controllers/public.controller'

const router = Router()

// Todas las rutas de este archivo son 100% públicas — sin login ni token
router.get('/courses', getPublicCourses)
router.get('/courses/:slug', getPublicCourseDetail)
router.get('/instructor', getInstructorProfile)
router.get('/pricing', getPricing)
router.get('/search', searchCourses)

export default router