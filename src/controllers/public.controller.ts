import { Request, Response } from 'express'
import Course from '../models/Course'
import User from '../models/User'
import Enrollment from '../models/Enrollment'
import Subscription from '../models/Subscription'

// GET /api/public/courses — catálogo completo de cursos publicados
// La página principal de la plataforma — cualquiera puede verla sin login
export const getPublicCourses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const courses = await Course.find({ isPublished: true })
      .populate('instructor', 'name avatar')
      .select( // solo los campos necesarios para la card del curso en el catálogo
        'title slug shortDescription thumbnail price currency level ' +
        'language tags rating reviewsCount enrollmentCount totalLessons ' +
        'totalDuration isFeatured createdAt'
      )
      .sort('-isFeatured -createdAt') // destacados primero, después más recientes

    res.json({ courses, total: courses.length })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/public/courses/:slug — detalle público de un curso
// Incluye módulos y lecciones (sin las URLs de video — esas requieren acceso)
// Se usa para la página de ventas del curso: descripción, contenido, precio
export const getPublicCourseDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const course = await Course.findOne({ slug: req.params.slug, isPublished: true })
      .populate('instructor', 'name avatar')

    if (!course) {
      res.status(404).json({ message: 'Curso no encontrado' })
      return
    }

    // Traemos la estructura del curso (módulos + lecciones) para el preview
    // pero SIN las URLs de video — esas solo se entregan si el usuario tiene acceso
    const { default: Module } = await import('../models/Module')
    const { default: Lesson } = await import('../models/Lesson')

    const modules = await Module.find({ course: course._id, isPublished: true }).sort('order')

    const modulesWithLessons = await Promise.all(
      modules.map(async (mod) => {
        const lessons = await Lesson.find({ module: mod._id, isPublished: true })
          .select('title duration isFree order') // no incluimos el video
          .sort('order')
        return { ...mod.toObject(), lessons }
      })
    )

    res.json({ course, modules: modulesWithLessons })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/public/instructor — perfil público del instructor
// Se muestra en la landing y en las páginas de los cursos
export const getInstructorProfile = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Buscamos el instructor (asumimos que hay uno solo por ahora)
    const instructor = await User.findOne({ role: 'instructor' })
      .select('name avatar')

    if (!instructor) {
      res.status(404).json({ message: 'Instructor no encontrado' })
      return
    }

    // Estadísticas públicas del instructor
    const totalCourses = await Course.countDocuments({
      instructor: instructor._id,
      isPublished: true
    })

    const totalStudents = await Enrollment.countDocuments({ status: 'active' })
    const totalSubscribers = await Subscription.countDocuments({ status: 'active' })

    res.json({
      instructor: {
        name: instructor.name,
        avatar: instructor.avatar,
      },
      stats: {
        totalCourses,
        totalStudents: totalStudents + totalSubscribers
      }
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/public/pricing — información de planes y precios
// Se muestra en la página de precios — sin login
export const getPricing = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Traemos todos los cursos con sus precios para mostrar en la página de precios
    const courses = await Course.find({ isPublished: true })
      .select('title slug price currency thumbnail')
      .sort('price')

    // El precio de suscripción viene de Stripe — por ahora lo hardcodeamos
    // En el futuro podemos consultar la API de Stripe para obtenerlo dinámicamente
    res.json({
      subscription: {
        price: 29.99,
        currency: 'USD',
        interval: 'month',
        description: 'Acceso ilimitado a todos los cursos',
        stripePriceId: process.env.STRIPE_SUBSCRIPTION_PRICE_ID
      },
      courses // para que el usuario vea también la opción de compra individual
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/public/search?q=fade — búsqueda de cursos
// Permite buscar cursos por título, descripción o tags
export const searchCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.status(400).json({ message: 'La búsqueda debe tener al menos 2 caracteres' })
      return
    }

    // Búsqueda con regex insensible a mayúsculas en título, descripción y tags
    const courses = await Course.find({
      isPublished: true,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    })
      .populate('instructor', 'name avatar')
      .select('title slug shortDescription thumbnail price level rating enrollmentCount')
      .limit(20) // máximo 20 resultados

    res.json({ courses, total: courses.length, query: q })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}