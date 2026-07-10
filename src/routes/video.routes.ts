import { Router } from 'express'
import {
  uploadLessonVideo,
  deleteLessonVideo,
  getStreamUrl,
  updateVideoStatus,
  uploadCourseThumbnail
} from '../controllers/video.controller'
import { protect } from '../middlewares/auth.middleware'
import { restrictTo } from '../middlewares/role.middleware'
import { uploadVideo, uploadImage } from '../middlewares/upload.middleware'
import { checkLessonAccess } from '../middlewares/checkAccess.middleware' // ← nuevo

const router = Router()

// Subir video — solo instructor/admin
router.post(
  '/lessons/:id/video',
  protect,
  restrictTo('instructor', 'admin'),
  uploadVideo.single('video'),
  uploadLessonVideo
)

// Eliminar video — solo instructor/admin
router.delete(
  '/lessons/:id/video',
  protect,
  restrictTo('instructor', 'admin'),
  deleteLessonVideo
)

// Obtener URL firmada — requiere login + verificación de acceso
// protect verifica el token, checkLessonAccess verifica si pagó
// Si la lección es gratis (isFree: true), checkLessonAccess deja pasar sin verificar pago
router.get(
  '/lessons/:id/stream',
  protect,
  checkLessonAccess, // ← agregamos la verificación de acceso
  getStreamUrl
)

// Actualizar estado del video
router.patch(
  '/lessons/:id/video/status',
  protect,
  restrictTo('instructor', 'admin'),
  updateVideoStatus
)

// Subir thumbnail
router.post(
  '/courses/:id/thumbnail',
  protect,
  restrictTo('instructor', 'admin'),
  uploadImage.single('thumbnail'),
  uploadCourseThumbnail
)

export default router