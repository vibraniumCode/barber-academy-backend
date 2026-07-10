import { Request, Response } from 'express'
import Lesson from '../models/Lesson'
import Module from '../models/Module'
import { AuthRequest } from '../types'

// GET /api/lessons/:id — obtiene una lección específica
// Este endpoint va a ser protegido en el Módulo 6 (control de acceso)
// Por ahora lo dejamos preparado sin restricción de pago
export const getLessonById = async (req: Request, res: Response): Promise<void> => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate('module', 'title')   // trae el título del módulo al que pertenece
      .populate('course', 'title slug') // y el título/slug del curso

    if (!lesson) {
      res.status(404).json({ message: 'Lección no encontrada' })
      return
    }

    res.json({ lesson })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// POST /api/modules/:moduleId/lessons — crea una lección dentro de un módulo
// El video lo agregaremos en el Módulo 4 cuando integremos Bunny.net
// Por ahora creamos la lección sin video
export const createLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, order, isFree } = req.body

    // Buscamos el módulo para saber a qué curso pertenece
    // (necesitamos el courseId para guardarlo en la lección también)
    const module = await Module.findById(req.params.moduleId)
    if (!module) {
      res.status(404).json({ message: 'Módulo no encontrado' })
      return
    }

    const lesson = await Lesson.create({
      module: req.params.moduleId,
      course: module.course, // heredamos el curso del módulo
      title,
      description,
      order,
      isFree: isFree || false
    })

    res.status(201).json({ lesson })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// PATCH /api/lessons/:id — edita una lección (título, descripción, orden, etc.)
export const updateLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    if (!lesson) {
      res.status(404).json({ message: 'Lección no encontrada' })
      return
    }

    res.json({ lesson })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// DELETE /api/lessons/:id — elimina una lección
// En el Módulo 4 agregaremos también la eliminación del video en Bunny.net
export const deleteLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.id)

    if (!lesson) {
      res.status(404).json({ message: 'Lección no encontrada' })
      return
    }

    // TODO Módulo 4: borrar el video de Bunny.net cuando eliminamos la lección
    res.json({ message: 'Lección eliminada correctamente' })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}