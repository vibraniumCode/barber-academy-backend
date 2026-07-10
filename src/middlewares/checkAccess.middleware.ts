import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'
import Lesson from '../models/Lesson'
import Enrollment from '../models/Enrollment'
import Subscription from '../models/Subscription'

// checkLessonAccess: middleware que verifica si el usuario tiene acceso a una lección
// Se usa en el endpoint GET /api/video/lessons/:id/stream (obtener URL del video)
// Si no tiene acceso → 403 Forbidden
// Si tiene acceso → deja pasar al controller que genera la signed URL
export const checkLessonAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lesson = await Lesson.findById(req.params.id)

    if (!lesson) {
      res.status(404).json({ message: 'Lección no encontrada' })
      return
    }

    // Condición 1: la lección es gratis — cualquiera puede verla sin pagar
    // Es útil para ofrecer una preview del curso y convencer al usuario de comprarlo
    if (lesson.isFree) {
      next()
      return
    }

    // Si no está logueado, no puede ver contenido de pago
    if (!req.user) {
      res.status(401).json({ message: 'Debés iniciar sesión para ver este contenido' })
      return
    }

    // Condición 2: instructor o admin — siempre tienen acceso sin restricciones
    if (req.user.role === 'instructor' || req.user.role === 'admin') {
      next()
      return
    }

    // Condición 3: tiene suscripción activa — acceso a todos los cursos
    const subscription = await Subscription.findOne({
      student: req.user._id,
      status: 'active'
    })

    if (subscription) {
      // Verificamos que la suscripción no haya vencido
      // (puede estar marcada como activa pero el período ya pasó)
      if (subscription.currentPeriodEnd > new Date()) {
        next()
        return
      }
    }

    // Condición 4: compró el curso individualmente
    // Buscamos un enrollment activo para este curso específico
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: lesson.course, // la lección sabe a qué curso pertenece
      status: 'active'
    })

    if (enrollment) {
      next()
      return
    }

    // Si no cumple ninguna condición → acceso denegado
    res.status(403).json({
      message: 'No tenés acceso a este contenido. Comprá el curso o suscribite para verlo.',
      courseId: lesson.course // le mandamos el courseId para que el frontend pueda redirigir a la página de compra
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// checkCourseAccess: versión simplificada para verificar acceso a un curso completo
// Se usa en el panel del estudiante para saber si puede entrar a un curso
export const checkCourseAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Debés iniciar sesión' })
      return
    }

    // Instructor y admin siempre tienen acceso
    if (req.user.role === 'instructor' || req.user.role === 'admin') {
      next()
      return
    }

    // Verificamos suscripción activa
    const subscription = await Subscription.findOne({
      student: req.user._id,
      status: 'active',
      currentPeriodEnd: { $gt: new Date() } // mayor que la fecha actual → todavía vigente
    })

    if (subscription) {
      next()
      return
    }

    // Verificamos enrollment individual
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: req.params.courseId,
      status: 'active'
    })

    if (enrollment) {
      next()
      return
    }

    res.status(403).json({
      message: 'No tenés acceso a este curso.',
      courseId: req.params.courseId
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}