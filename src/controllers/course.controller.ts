import { Request, Response } from 'express'
import Course from '../models/Course'
import { AuthRequest } from '../types'

// Helper: convierte un título en slug URL-friendly
// Ej: "Corte Clásico 2024" → "corte-clasico-2024"
const slugify = (text: string): string =>
  text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

// GET /api/courses — lista todos los cursos publicados (público)
// Los estudiantes ven el catálogo sin necesidad de login
export const getCourses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const courses = await Course.find({ isPublished: true })
      .populate('instructor', 'name avatar') // trae el nombre y avatar del instructor
      .sort('-createdAt')                     // más recientes primero
    res.json({ courses })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/courses/:slug — detalle de un curso por su slug (público)
// Usamos slug en vez de ID para URLs más limpias y amigables al SEO
// Ej: /api/courses/corte-clasico en vez de /api/courses/64abc123...
export const getCourseBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const course = await Course.findOne({ slug: req.params.slug, isPublished: true })
      .populate('instructor', 'name avatar bio')

    if (!course) {
      res.status(404).json({ message: 'Curso no encontrado' })
      return
    }

    res.json({ course })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/courses/admin/all — lista TODOS los cursos (publicados y borradores)
// Solo el instructor/admin puede ver los cursos no publicados todavía
export const getAllCoursesAdmin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const courses = await Course.find()
      .populate('instructor', 'name avatar')
      .sort('-createdAt')
    res.json({ courses })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// POST /api/courses — crea un curso nuevo (solo instructor/admin)
export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, shortDescription, price, level, language, tags } = req.body

    // Generamos el slug a partir del título
    let slug = slugify(title)

    // Si ya existe un curso con ese slug, le agregamos un número al final
    // para evitar duplicados (igual que hicimos con las barberías)
    let suffix = 1
    while (await Course.findOne({ slug })) {
      slug = `${slugify(title)}-${suffix}`
      suffix++
    }

    const course = await Course.create({
      title,
      slug,
      description,
      shortDescription,
      price,
      level,
      language,
      tags,
      instructor: req.user?._id  // el instructor es el usuario logueado
    })

    res.status(201).json({ course })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// PATCH /api/courses/:id — edita un curso existente (solo instructor/admin)
export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // new:true devuelve el doc actualizado
    )

    if (!course) {
      res.status(404).json({ message: 'Curso no encontrado' })
      return
    }

    res.json({ course })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// PATCH /api/courses/:id/publish — publica o despublica un curso
// Separamos esto en su propio endpoint para que sea una acción explícita
// (no queremos que un curso se publique accidentalmente al editar)
export const togglePublish = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id)

    if (!course) {
      res.status(404).json({ message: 'Curso no encontrado' })
      return
    }

    // Alternamos el estado: si estaba publicado lo despublicamos y viceversa
    course.isPublished = !course.isPublished
    await course.save()

    res.json({
      course,
      message: course.isPublished ? 'Curso publicado' : 'Curso despublicado'
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// DELETE /api/courses/:id — elimina un curso (solo admin)
export const deleteCourse = async (_req: Request, res: Response): Promise<void> => {
  try {
    const course = await Course.findByIdAndDelete(_req.params.id)

    if (!course) {
      res.status(404).json({ message: 'Curso no encontrado' })
      return
    }

    // TODO: cuando integremos Bunny.net (Módulo 4), también borraremos los videos del CDN acá
    res.json({ message: 'Curso eliminado correctamente' })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}