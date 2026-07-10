import { Request, Response } from 'express'
import Module from '../models/Module'
import Lesson from '../models/Lesson'
import { AuthRequest } from '../types'

// GET /api/courses/:courseId/modules — lista los módulos de un curso
// Incluye las lecciones de cada módulo (populate)
// Los estudiantes usan esto para ver el índice del curso
export const getModules = async (req: Request, res: Response): Promise<void> => {
  try {
    const modules = await Module.find({ course: req.params.courseId, isPublished: true })
      .sort('order') // los módulos se ordenan por el campo "order" (1, 2, 3...)

    // Para cada módulo, traemos sus lecciones ordenadas
    // No traemos el video completo acá — solo metadata (título, duración, si es gratis)
    const modulesWithLessons = await Promise.all(
      modules.map(async (mod) => {
        const lessons = await Lesson.find({ module: mod._id, isPublished: true })
          .select('title duration isFree order') // solo los campos necesarios para el índice
          .sort('order')
        return { ...mod.toObject(), lessons }
      })
    )

    res.json({ modules: modulesWithLessons })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// POST /api/courses/:courseId/modules — crea un módulo nuevo dentro de un curso
export const createModule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, order } = req.body

    const module = await Module.create({
      course: req.params.courseId,
      title,
      description,
      order
    })

    res.status(201).json({ module })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// PATCH /api/modules/:id — edita un módulo existente
export const updateModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const module = await Module.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    if (!module) {
      res.status(404).json({ message: 'Módulo no encontrado' })
      return
    }

    res.json({ module })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// DELETE /api/modules/:id — elimina un módulo y todas sus lecciones
// Cuando borrás un módulo, borramos también las lecciones que contiene
// para no dejar "huérfanos" en la base de datos
export const deleteModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const module = await Module.findByIdAndDelete(req.params.id)

    if (!module) {
      res.status(404).json({ message: 'Módulo no encontrado' })
      return
    }

    // Borramos todas las lecciones que pertenecían a este módulo
    await Lesson.deleteMany({ module: req.params.id })

    res.json({ message: 'Módulo y sus lecciones eliminados correctamente' })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}