import { Router } from 'express'
import {
  getCourses, getCourseBySlug, getAllCoursesAdmin,
  createCourse, updateCourse, togglePublish, deleteCourse
} from '../controllers/course.controller'
import {
  getModules, createModule, updateModule, deleteModule
} from '../controllers/module.controller'
import {
  getLessonById, createLesson, updateLesson, deleteLesson
} from '../controllers/lesson.controller'
import { protect } from '../middlewares/auth.middleware'
import { restrictTo } from '../middlewares/role.middleware'
import { checkCourseAccess } from '../middlewares/checkAccess.middleware'

const router = Router()

// ── CURSOS ──────────────────────────────────────────────────

// Rutas públicas — cualquiera puede ver el catálogo
router.get('/', getCourses)
router.get('/:slug', getCourseBySlug)

// Rutas privadas — solo instructor o admin
// protect verifica el token, restrictTo verifica el rol
router.get('/admin/all', protect, restrictTo('instructor', 'admin'), getAllCoursesAdmin)
router.post('/', protect, restrictTo('instructor', 'admin'), createCourse)
router.patch('/:id', protect, restrictTo('instructor', 'admin'), updateCourse)
router.patch('/:id/publish', protect, restrictTo('instructor', 'admin'), togglePublish)
router.delete('/:id', protect, restrictTo('admin'), deleteCourse)  // solo admin puede borrar

// ── MÓDULOS ──────────────────────────────────────────────────

// Pública: ver el índice de un curso (módulos + lecciones)
router.get('/:courseId/modules', getModules)

// Privadas: gestionar módulos
router.post('/:courseId/modules', protect, restrictTo('instructor', 'admin'), createModule)
router.patch('/modules/:id', protect, restrictTo('instructor', 'admin'), updateModule)
router.delete('/modules/:id', protect, restrictTo('instructor', 'admin'), deleteModule)

// ── LECCIONES ──────────────────────────────────────────────────

// Pública: ver una lección (el control de acceso real va en el Módulo 6)
router.get('/lessons/:id', getLessonById)

// Privadas: gestionar lecciones
router.post('/modules/:moduleId/lessons', protect, restrictTo('instructor', 'admin'), createLesson)
router.patch('/lessons/:id', protect, restrictTo('instructor', 'admin'), updateLesson)
router.delete('/lessons/:id', protect, restrictTo('instructor', 'admin'), deleteLesson)

// Verifica si el usuario logueado tiene acceso a un curso específico
// El frontend llama a esto antes de mostrar el contenido del curso
router.get(
  '/:courseId/access',
  protect,
  checkCourseAccess,
  (_req, res) => res.json({ hasAccess: true }) // si llegó acá, tiene acceso
)

export default router