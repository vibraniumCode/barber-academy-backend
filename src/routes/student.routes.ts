import { Router } from 'express'
import {
  getStudentDashboard,
  getCourseProgress,
  markLessonComplete,
  unmarkLessonComplete,
  getCompletedCourses
} from '../controllers/student.controller'
import { protect } from '../middlewares/auth.middleware'

const router = Router()

// Todas las rutas del estudiante requieren login
router.use(protect)

// Dashboard general
router.get('/dashboard', getStudentDashboard)

// Cursos completados / certificados
router.get('/certificates', getCompletedCourses)

// Progreso en un curso
router.get('/courses/:courseId/progress', getCourseProgress)

// Marcar/desmarcar lección como completada
router.post('/courses/:courseId/lessons/:lessonId/complete', markLessonComplete)
router.delete('/courses/:courseId/lessons/:lessonId/complete', unmarkLessonComplete)

export default router