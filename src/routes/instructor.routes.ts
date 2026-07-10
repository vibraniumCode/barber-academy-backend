import { Router } from 'express'
import {
  getInstructorStats,
  getInstructorCourses,
  getCourseStudents,
  getRevenueByMonth,
  updateInstructorProfile
} from '../controllers/instructor.controller'
import { protect } from '../middlewares/auth.middleware'
import { restrictTo } from '../middlewares/role.middleware'

const router = Router()

// Todas las rutas del instructor requieren login y rol instructor o admin
router.use(protect, restrictTo('instructor', 'admin'))

// Dashboard del instructor
router.get('/stats', getInstructorStats)
router.get('/revenue', getRevenueByMonth)

// Gestión de cursos
router.get('/courses', getInstructorCourses)
router.get('/courses/:courseId/students', getCourseStudents)

// Perfil
router.patch('/profile', updateInstructorProfile)

export default router