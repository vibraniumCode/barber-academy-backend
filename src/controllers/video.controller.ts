import { Response } from 'express'
import { AuthRequest } from '../types'
import Lesson from '../models/Lesson'
import Course from '../models/Course'
import {
  createBunnyVideo,
  uploadBunnyVideo,
  deleteBunnyVideo,
  generateSignedUrl,
  getThumbnailUrl
} from '../utils/bunny'
import { bunnyConfig } from '../config/bunny'

// POST /api/lessons/:id/video — sube el video de una lección
// Proceso completo:
// 1. El instructor manda el archivo via multipart/form-data
// 2. multer lo guarda en memoria (req.file.buffer)
// 3. Creamos el contenedor en Bunny.net (obtenemos el videoId)
// 4. Subimos el archivo al contenedor
// 5. Guardamos el videoId y la URL del CDN en la lección
export const uploadLessonVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Verificamos que haya un archivo adjunto
    if (!req.file) {
      res.status(400).json({ message: 'No se recibió ningún archivo de video' })
      return
    }

    const lesson = await Lesson.findById(req.params.id)
    if (!lesson) {
      res.status(404).json({ message: 'Lección no encontrada' })
      return
    }

    // Paso 1: crear el contenedor en Bunny.net con el título de la lección
    const videoId = await createBunnyVideo(lesson.title)

    // Paso 2: subir el archivo al contenedor
    await uploadBunnyVideo(req.file.buffer, videoId)

    // Paso 3: guardar la referencia en la base de datos
    lesson.video = {
      bunnyVideoId: videoId,
      bunnyCdnUrl: `https://${bunnyConfig.cdnHostname}/${videoId}`,
      status: 'processing' // Bunny procesa el video en segundo plano
    }
    await lesson.save()

    res.json({
      message: 'Video subido correctamente. Procesando...',
      videoId,
      // El thumbnail ya está disponible aunque el video siga procesando
      thumbnailUrl: getThumbnailUrl(videoId)
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// DELETE /api/lessons/:id/video — elimina el video de una lección
// Borra el video de Bunny.net Y limpia la referencia en la base de datos
export const deleteLessonVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lesson = await Lesson.findById(req.params.id)
    if (!lesson) {
      res.status(404).json({ message: 'Lección no encontrada' })
      return
    }

    if (!lesson.video.bunnyVideoId) {
      res.status(400).json({ message: 'Esta lección no tiene video' })
      return
    }

    // Borramos el video de Bunny.net
    await deleteBunnyVideo(lesson.video.bunnyVideoId)

    // Limpiamos la referencia en la base de datos
    lesson.video = { bunnyVideoId: '', bunnyCdnUrl: '', status: 'processing' }
    await lesson.save()

    res.json({ message: 'Video eliminado correctamente' })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/lessons/:id/stream — genera una URL firmada para reproducir el video
// Este es el endpoint más importante del módulo:
// El frontend NUNCA tiene la URL real del video — siempre pide una URL firmada
// que expira en 2 horas. Así, aunque alguien inspeccione el código del navegador,
// la URL que encuentra ya expira pronto y no puede compartirla efectivamente.
export const getStreamUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lesson = await Lesson.findById(req.params.id)
    if (!lesson) {
      res.status(404).json({ message: 'Lección no encontrada' })
      return
    }

    if (!lesson.video.bunnyVideoId || lesson.video.status !== 'ready') {
      res.status(400).json({ message: 'El video no está disponible todavía' })
      return
    }

    // Generamos la URL firmada — expira en 2 horas (7200 segundos)
    // En el Módulo 6 agregaremos la verificación de pago antes de llegar acá
    const streamUrl = generateSignedUrl(lesson.video.bunnyVideoId, 7200)
    const thumbnailUrl = getThumbnailUrl(lesson.video.bunnyVideoId)

    res.json({ streamUrl, thumbnailUrl })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// PATCH /api/lessons/:id/video/status — webhook interno para actualizar el estado del video
// Bunny.net puede notificarnos cuando termina de procesar un video via webhook
// Por ahora lo implementamos como endpoint manual para poder marcarlo como "ready"
// En el futuro lo conectamos al webhook real de Bunny
export const updateVideoStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body
    const validStatuses = ['processing', 'ready', 'error']

    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: 'Estado inválido' })
      return
    }

    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      { 'video.status': status },
      { new: true }
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

// POST /api/courses/:id/thumbnail — sube el thumbnail de un curso
// Las imágenes de portada las manejamos diferente a los videos:
// las guardamos en Bunny Storage (no en Stream) o podemos usar otra solución
// Por simplicidad, por ahora guardamos la URL directamente
// (en el futuro podemos integrar Bunny Storage o Cloudinary para imágenes)
export const uploadCourseThumbnail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se recibió ninguna imagen' })
      return
    }

    // Por ahora devolvemos un placeholder — en el próximo paso integramos el storage real
    // TODO: subir a Bunny Storage o Cloudinary
    res.json({
      message: 'Thumbnail recibido (integración de storage pendiente)',
      size: req.file.size,
      mimetype: req.file.mimetype
    })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}