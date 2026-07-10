import { Response } from 'express'
import { AuthRequest } from '../types'
import Course from '../models/Course'
import Enrollment from '../models/Enrollment'
import Subscription from '../models/Subscription'
import Comment from '../models/Comment'
import User from '../models/User'

// GET /api/instructor/stats — estadísticas generales del instructor
// Le muestra un resumen de su negocio: ingresos, alumnos, cursos, etc.
export const getInstructorStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Buscamos todos los cursos del instructor
    const courses = await Course.find({ instructor: req.user?._id })
    const courseIds = courses.map(c => c._id)

    // Total de enrollments (compras individuales) en sus cursos
    const totalEnrollments = await Enrollment.countDocuments({
      course: { $in: courseIds },
      status: 'active'
    })

    // Total de suscriptores activos en la plataforma
    // (todos los suscriptores tienen acceso a todos los cursos)
    const totalSubscribers = await Subscription.countDocuments({ status: 'active' })

    // Ingresos totales por ventas individuales de sus cursos
    // Sumamos el precio de cada enrollment activo
    const enrollments = await Enrollment.find({
      course: { $in: courseIds },
      type: 'purchase',
      status: 'active'
    }).populate('course', 'price')

    const totalRevenue = enrollments.reduce((sum, enrollment) => {
      const course = enrollment.course as any
      return sum + (course?.price || 0)
    }, 0)

    // Comentarios sin responder — para que el instructor sepa qué preguntas atender
    const unansweredCount = await Comment.countDocuments({
      course: { $in: courseIds },
      parent: null,
      isVisible: true,
      isInstructorReply: false
    })

    res.json({
      totalCourses: courses.length,
      publishedCourses: courses.filter(c => c.isPublished).length,
      draftCourses: courses.filter(c => !c.isPublished).length,
      totalEnrollments,
      totalSubscribers,
      totalRevenue,
      unansweredComments: unansweredCount
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/instructor/courses — cursos del instructor con stats por curso
// Muestra cada curso con su cantidad de alumnos e ingresos individuales
export const getInstructorCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courses = await Course.find({ instructor: req.user?._id }).sort('-createdAt')

    // Para cada curso, agregamos estadísticas específicas
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        // Alumnos que compraron este curso individualmente
        const enrollmentCount = await Enrollment.countDocuments({
          course: course._id,
          type: 'purchase',
          status: 'active'
        })

        // Ingresos generados por este curso específico
        const revenue = enrollmentCount * course.price

        // Comentarios sin responder en este curso
        const unansweredComments = await Comment.countDocuments({
          course: course._id,
          parent: null,
          isVisible: true,
          isInstructorReply: false
        })

        return {
          ...course.toObject(),
          stats: { enrollmentCount, revenue, unansweredComments }
        }
      })
    )

    res.json({ courses: coursesWithStats })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/instructor/courses/:courseId/students — alumnos de un curso específico
// El instructor puede ver quiénes compraron su curso y su progreso
export const getCourseStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Verificamos que el curso pertenezca al instructor
    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.user?._id
    })

    if (!course) {
      res.status(404).json({ message: 'Curso no encontrado o no tenés permisos' })
      return
    }

    // Buscamos los enrollments del curso con datos del estudiante
    const enrollments = await Enrollment.find({
      course: req.params.courseId,
      status: 'active'
    })
      .populate('student', 'name email avatar createdAt')
      .sort('-createdAt')

    // Calculamos el progreso de cada estudiante
    // (porcentaje de lecciones completadas sobre el total del curso)
    const studentsWithProgress = enrollments.map(enrollment => {
      const completedLessons = enrollment.progress.length
      const progressPercentage = course.totalLessons > 0
        ? Math.round((completedLessons / course.totalLessons) * 100)
        : 0

      return {
        student: enrollment.student,
        enrolledAt: enrollment.createdAt,
        completedLessons,
        progressPercentage,
        completedCourse: !!enrollment.completedAt
      }
    })

    res.json({
      course: { title: course.title, totalLessons: course.totalLessons },
      students: studentsWithProgress,
      total: studentsWithProgress.length
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/instructor/revenue — detalle de ingresos por mes
// Útil para que el instructor vea la evolución de sus ventas en el tiempo
export const getRevenueByMonth = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courses = await Course.find({ instructor: req.user?._id })
    const courseIds = courses.map(c => c._id)

    // Agrupamos los enrollments por mes usando el aggregation pipeline de MongoDB
    // $dateToString convierte la fecha a formato "YYYY-MM" para agrupar por mes
    const revenueByMonth = await Enrollment.aggregate([
      {
        $match: {
          course: { $in: courseIds },
          type: 'purchase',
          status: 'active'
        }
      },
      {
        $lookup: {
          from: 'courses',        // join con la colección de cursos
          localField: 'course',   // campo en Enrollment
          foreignField: '_id',    // campo en Course
          as: 'courseData'
        }
      },
      { $unwind: '$courseData' }, // convierte el array de courseData en un objeto
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, // agrupar por mes
          revenue: { $sum: '$courseData.price' }, // sumar precios
          enrollments: { $sum: 1 }                // contar enrollments
        }
      },
      { $sort: { _id: 1 } }, // ordenar cronológicamente
      { $limit: 12 }          // últimos 12 meses
    ])

    res.json({ revenueByMonth })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// PATCH /api/instructor/profile — el instructor actualiza su perfil público
// Estos datos se muestran en la landing y en las páginas de los cursos
export const updateInstructorProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, avatar, bio } = req.body

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { name, avatar },
      { new: true, runValidators: true }
    )

    res.json({ user, bio }) // bio la vamos a agregar al modelo User en el siguiente paso
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}