import { Response } from 'express'
import { AuthRequest } from '../types'
import Enrollment from '../models/Enrollment'
import Subscription from '../models/Subscription'
import Lesson from '../models/Lesson'
import Course from '../models/Course'

// GET /api/student/dashboard — resumen del panel del estudiante
// Muestra cuántos cursos tiene, su progreso general y estado de suscripción
export const getStudentDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Cursos comprados individualmente
    const enrollments = await Enrollment.find({
      student: req.user?._id,
      status: 'active'
    }).populate('course', 'title slug thumbnail totalLessons')

    // Estado de suscripción actual
    const subscription = await Subscription.findOne({
      student: req.user?._id,
      status: { $in: ['active', 'past_due'] } // incluimos past_due por si hay problemas de pago
    })

    // Calculamos el progreso de cada curso
    const coursesWithProgress = enrollments.map(enrollment => {
      const course = enrollment.course as any
      const completedLessons = enrollment.progress.length
      const progressPercentage = course?.totalLessons > 0
        ? Math.round((completedLessons / course.totalLessons) * 100)
        : 0

      return {
        course,
        completedLessons,
        totalLessons: course?.totalLessons || 0,
        progressPercentage,
        completedCourse: !!enrollment.completedAt,
        enrolledAt: enrollment.createdAt
      }
    })

    res.json({
      totalCourses: enrollments.length,
      subscription: subscription ? {
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      } : null,
      courses: coursesWithProgress
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/student/courses/:courseId/progress — progreso detallado en un curso
// Muestra qué lecciones completó y cuáles le faltan
export const getCourseProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user?._id,
      course: req.params.courseId,
      status: 'active'
    })

    if (!enrollment) {
      res.status(404).json({ message: 'No tenés acceso a este curso' })
      return
    }

    // Traemos todas las lecciones del curso ordenadas
    const lessons = await Lesson.find({
      course: req.params.courseId,
      isPublished: true
    })
      .select('title order module duration isFree')
      .populate('module', 'title order')
      .sort('order')

    // Marcamos cuáles están completadas según el progreso del enrollment
    const completedLessonIds = enrollment.progress.map(p => p.lesson.toString())

    const lessonsWithStatus = lessons.map(lesson => ({
      ...lesson.toObject(),
      completed: completedLessonIds.includes(lesson._id.toString())
    }))

    const progressPercentage = lessons.length > 0
      ? Math.round((completedLessonIds.length / lessons.length) * 100)
      : 0

    res.json({
      lessons: lessonsWithStatus,
      completedLessons: completedLessonIds.length,
      totalLessons: lessons.length,
      progressPercentage,
      completedCourse: !!enrollment.completedAt
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// POST /api/student/courses/:courseId/lessons/:lessonId/complete
// Marca una lección como completada
// El progreso se guarda en el enrollment del estudiante
export const markLessonComplete = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId, lessonId } = req.params

    const enrollment = await Enrollment.findOne({
      student: req.user?._id,
      course: courseId,
      status: 'active'
    })

    if (!enrollment) {
      res.status(404).json({ message: 'No tenés acceso a este curso' })
      return
    }

    // Verificamos que la lección no esté ya marcada como completada
    const alreadyCompleted = enrollment.progress.some(
      p => p.lesson.toString() === lessonId
    )

    if (!alreadyCompleted) {
      // Agregamos la lección al array de progreso con la fecha de completado
      enrollment.progress.push({
        lesson: lessonId as any,
        completedAt: new Date()
      })

      // Verificamos si completó todas las lecciones del curso
      const totalLessons = await Lesson.countDocuments({
        course: courseId,
        isPublished: true
      })

      if (enrollment.progress.length >= totalLessons) {
        // ¡Completó el curso! Guardamos la fecha de finalización
        enrollment.completedAt = new Date()
      }

      await enrollment.save()
    }

    res.json({
      message: alreadyCompleted ? 'Lección ya estaba completada' : 'Lección completada',
      completedLessons: enrollment.progress.length,
      completedCourse: !!enrollment.completedAt
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// DELETE /api/student/courses/:courseId/lessons/:lessonId/complete
// Desmarca una lección como completada (por si el estudiante quiere repasar)
export const unmarkLessonComplete = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId, lessonId } = req.params

    const enrollment = await Enrollment.findOne({
      student: req.user?._id,
      course: courseId,
      status: 'active'
    })

    if (!enrollment) {
      res.status(404).json({ message: 'No tenés acceso a este curso' })
      return
    }

    // Removemos la lección del array de progreso
    enrollment.progress = enrollment.progress.filter(
      p => p.lesson.toString() !== lessonId
    ) as any

    // Si desmarca una lección, también reseteamos el completedAt del curso
    enrollment.completedAt = null as any

    await enrollment.save()

    res.json({
      message: 'Lección desmarcada',
      completedLessons: enrollment.progress.length
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/student/certificates — cursos completados (futura generación de certificados)
// Por ahora devuelve la lista de cursos completados
// En el futuro podemos generar PDFs de certificados acá
export const getCompletedCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const completedEnrollments = await Enrollment.find({
      student: req.user?._id,
      status: 'active',
      completedAt: { $ne: null } // solo los que tienen fecha de completado
    }).populate('course', 'title slug thumbnail instructor')

    res.json({
      completedCourses: completedEnrollments.map(e => ({
        course: e.course,
        completedAt: e.completedAt,
        enrollmentId: e._id
      })),
      total: completedEnrollments.length
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}