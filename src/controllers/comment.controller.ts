import { Response } from 'express'
import { AuthRequest } from '../types'
import Comment from '../models/Comment'
import Enrollment from '../models/Enrollment'
import Subscription from '../models/Subscription'

// Helper: verifica si el usuario tiene acceso al curso
// (mismo chequeo que en checkAccess pero como función reutilizable)
const hasAccessToCourse = async (userId: string, courseId: string, role: string): Promise<boolean> => {
  // Instructor y admin siempre tienen acceso
  if (role === 'instructor' || role === 'admin') return true

  // Verificamos suscripción activa
  const subscription = await Subscription.findOne({
    student: userId,
    status: 'active',
    currentPeriodEnd: { $gt: new Date() }
  })
  if (subscription) return true

  // Verificamos enrollment individual
  const enrollment = await Enrollment.findOne({
    student: userId,
    course: courseId,
    status: 'active'
  })
  return !!enrollment
}

// GET /api/comments/lesson/:lessonId — obtiene los comentarios de una lección
// Devuelve comentarios principales (sin parent) con sus respuestas anidadas
// Solo usuarios con acceso al curso pueden ver los comentarios
export const getLessonComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Traemos solo los comentarios principales (los que no son respuesta a otro)
    // Las respuestas las anidamos dentro de cada comentario principal
    const comments = await Comment.find({
      lesson: req.params.lessonId,
      parent: null,        // solo comentarios raíz (no respuestas)
      isVisible: true
    })
      .populate('author', 'name avatar role') // datos del autor
      .sort('-createdAt')                      // más recientes primero

    // Para cada comentario principal, buscamos sus respuestas
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({
          parent: comment._id,  // respuestas a este comentario
          isVisible: true
        })
          .populate('author', 'name avatar role')
          .sort('createdAt') // respuestas en orden cronológico (las más viejas primero)

        return { ...comment.toObject(), replies }
      })
    )

    res.json({ comments: commentsWithReplies })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// POST /api/comments/lesson/:lessonId — crea un comentario en una lección
// Solo usuarios con acceso al curso pueden comentar
export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, courseId } = req.body

    if (!content || !courseId) {
      res.status(400).json({ message: 'El contenido y el courseId son requeridos' })
      return
    }

    // Verificamos que el usuario tenga acceso al curso antes de permitir comentar
    // No queremos que alguien que no pagó pueda interactuar en la comunidad
    const access = await hasAccessToCourse(
      req.user?._id.toString() as string,
      courseId,
      req.user?.role as string
    )

    if (!access) {
      res.status(403).json({ message: 'Necesitás acceso al curso para comentar' })
      return
    }

    const comment = await Comment.create({
      lesson: req.params.lessonId,
      course: courseId,
      author: req.user?._id,
      content,
      parent: null, // es un comentario principal, no una respuesta
      isInstructorReply: req.user?.role === 'instructor' // marcamos si es el instructor quien comenta
    })

    // Populamos el autor para devolverlo completo en la respuesta
    await comment.populate('author', 'name avatar role')

    res.status(201).json({ comment })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// POST /api/comments/:commentId/reply — responde a un comentario existente
// El instructor puede responder preguntas de los estudiantes
// Los estudiantes también pueden responder entre sí
export const replyToComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, courseId } = req.body

    if (!content || !courseId) {
      res.status(400).json({ message: 'El contenido y el courseId son requeridos' })
      return
    }

    // Buscamos el comentario padre para saber a qué lección pertenece
    const parentComment = await Comment.findById(req.params.commentId)
    if (!parentComment) {
      res.status(404).json({ message: 'Comentario no encontrado' })
      return
    }

    // Verificamos acceso al curso
    const access = await hasAccessToCourse(
      req.user?._id.toString() as string,
      courseId,
      req.user?.role as string
    )

    if (!access) {
      res.status(403).json({ message: 'Necesitás acceso al curso para responder' })
      return
    }

    const reply = await Comment.create({
      lesson: parentComment.lesson,  // misma lección que el comentario padre
      course: courseId,
      author: req.user?._id,
      content,
      parent: parentComment._id,     // referencia al comentario que estamos respondiendo
      isInstructorReply: req.user?.role === 'instructor'
    })

    await reply.populate('author', 'name avatar role')

    res.status(201).json({ reply })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// PATCH /api/comments/:commentId/like — dar o quitar like a un comentario
// Funciona como toggle: si ya le diste like, lo quitás; si no, lo agregás
export const toggleLike = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const comment = await Comment.findById(req.params.commentId)
    if (!comment) {
      res.status(404).json({ message: 'Comentario no encontrado' })
      return
    }

    const userId = req.user?._id
    // Verificamos si ya le dio like (si el ID del usuario está en el array de likes)
    const alreadyLiked = comment.likes.some(id => id.toString() === userId?.toString())

    if (alreadyLiked) {
      // Ya le dio like → lo quitamos ($pull saca un elemento del array)
      comment.likes = comment.likes.filter(id => id.toString() !== userId?.toString()) as any
    } else {
      // No le dio like → lo agregamos
      comment.likes.push(userId as any)
    }

    await comment.save()

    res.json({
      likes: comment.likes.length,
      liked: !alreadyLiked  // el nuevo estado del like
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// DELETE /api/comments/:commentId — elimina un comentario
// Solo el autor del comentario o un admin puede eliminarlo
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const comment = await Comment.findById(req.params.commentId)
    if (!comment) {
      res.status(404).json({ message: 'Comentario no encontrado' })
      return
    }

    // Verificamos que sea el autor o un admin
    const isAuthor = comment.author.toString() === req.user?._id.toString()
    const isAdmin = req.user?.role === 'admin'

    if (!isAuthor && !isAdmin) {
      res.status(403).json({ message: 'No podés eliminar este comentario' })
      return
    }

    // Soft delete: marcamos como no visible en vez de borrar
    // Así no rompemos las referencias de las respuestas que apuntan a este comentario
    comment.isVisible = false
    await comment.save()

    // También ocultamos todas las respuestas a este comentario
    await Comment.updateMany({ parent: comment._id }, { isVisible: false })

    res.json({ message: 'Comentario eliminado correctamente' })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/comments/instructor — el instructor ve todos los comentarios sin responder
// Útil para que el instructor no se pierda ninguna pregunta
export const getUnansweredComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Buscamos comentarios que no tienen ninguna respuesta del instructor
    // Primero conseguimos los IDs de comentarios que YA tienen respuesta del instructor
    const answeredCommentIds = await Comment.distinct('parent', {
      isInstructorReply: true,
      parent: { $ne: null }
    })

    // Después buscamos los que NO están en esa lista
    const unanswered = await Comment.find({
      parent: null,           // solo comentarios principales
      isVisible: true,
      _id: { $nin: answeredCommentIds } // que no estén en la lista de ya respondidos
    })
      .populate('author', 'name avatar')
      .populate('lesson', 'title')      // título de la lección para contexto
      .populate('course', 'title')      // título del curso
      .sort('-createdAt')
      .limit(50) // máximo 50 comentarios sin responder

    res.json({ comments: unanswered, total: unanswered.length })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}