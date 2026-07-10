import multer from 'multer'

// Configuramos multer para guardar archivos en memoria (no en disco)
// Esto es importante porque vamos a mandar el archivo directo a Bunny.net
// sin guardarlo primero en el servidor — más rápido y no consume espacio en disco
const storage = multer.memoryStorage()

// uploadVideo: middleware para subir videos
// Límite de 500MB por archivo (ajustable según necesidad)
export const uploadVideo = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB en bytes
  fileFilter: (_req, file, cb) => {
    // Solo aceptamos archivos de video
    if (file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten archivos de video'))
    }
  }
})

// uploadImage: middleware para subir imágenes (thumbnails de cursos)
// Límite de 5MB por archivo
export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB en bytes
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten archivos de imagen'))
    }
  }
})