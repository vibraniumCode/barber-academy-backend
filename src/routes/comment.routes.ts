import { Router } from 'express'
import {
  getLessonComments,
  createComment,
  replyToComment,
  toggleLike,
  deleteComment,
  getUnansweredComments
} from '../controllers/comment.controller'
import { protect } from '../middlewares/auth.middleware'
import { restrictTo } from '../middlewares/role.middleware'

const router = Router()

// Ver comentarios de una lección — requiere login
// (solo usuarios con acceso al curso pueden ver los comentarios)
router.get('/lesson/:lessonId', protect, getLessonComments)

// Crear comentario en una lección
router.post('/lesson/:lessonId', protect, createComment)

// Responder a un comentario
router.post('/:commentId/reply', protect, replyToComment)

// Like/Unlike a un comentario
router.patch('/:commentId/like', protect, toggleLike)

// Eliminar comentario (autor o admin)
router.delete('/:commentId', protect, deleteComment)

// Panel del instructor: ver comentarios sin responder
router.get('/instructor/unanswered', protect, restrictTo('instructor', 'admin'), getUnansweredComments)

export default router