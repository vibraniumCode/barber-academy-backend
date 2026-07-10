import crypto from 'crypto'
import axios from 'axios'
import { bunnyConfig } from '../config/bunny'

// ── SUBIDA DE VIDEOS ──────────────────────────────────────────

// createBunnyVideo: crea un "contenedor" vacío en Bunny.net para un video
// Bunny.net funciona en 2 pasos:
// 1. Crear el video (obtenés un ID)
// 2. Subir el archivo al ID que te devolvió
// Esta función hace el paso 1
export const createBunnyVideo = async (title: string): Promise<string> => {
  const response = await axios.post(
    `${bunnyConfig.apiUrl}/videos`,
    { title },
    {
      headers: {
        AccessKey: bunnyConfig.apiKey,
        'Content-Type': 'application/json'
      }
    }
  )
  // Devolvemos el ID del video recién creado
  return response.data.guid
}

// uploadBunnyVideo: sube el archivo de video al contenedor que creamos
// buffer: el archivo en memoria (lo manda multer desde el controller)
// videoId: el ID que obtuvimos en el paso anterior
export const uploadBunnyVideo = async (buffer: Buffer, videoId: string): Promise<void> => {
  await axios.put(
    `${bunnyConfig.apiUrl}/videos/${videoId}`,
    buffer,
    {
      headers: {
        AccessKey: bunnyConfig.apiKey,
        'Content-Type': 'application/octet-stream' // tipo para archivos binarios
      },
      maxBodyLength: Infinity,  // sin límite de tamaño para el upload
      maxContentLength: Infinity
    }
  )
}

// deleteBunnyVideo: elimina un video de Bunny.net
// Lo usamos cuando el instructor borra una lección
export const deleteBunnyVideo = async (videoId: string): Promise<void> => {
  await axios.delete(
    `${bunnyConfig.apiUrl}/videos/${videoId}`,
    {
      headers: { AccessKey: bunnyConfig.apiKey }
    }
  )
}

// getBunnyVideoStatus: consulta el estado de procesamiento de un video
// Bunny.net procesa el video después de subirlo (genera múltiples calidades)
// Los estados posibles son: 0=Queued, 1=Processing, 2=Encoding, 3=Finished, 4=Error
export const getBunnyVideoStatus = async (videoId: string): Promise<number> => {
  const response = await axios.get(
    `${bunnyConfig.apiUrl}/videos/${videoId}`,
    {
      headers: { AccessKey: bunnyConfig.apiKey }
    }
  )
  return response.data.status
}

// ── SIGNED URLs (el corazón de la seguridad) ──────────────────

// generateSignedUrl: genera una URL temporal y firmada para reproducir un video
// 
// ¿Por qué firmada? Porque sin esto, cualquiera que tenga la URL del CDN
// puede compartirla y cualquiera podría ver el video sin pagar.
// Con signed URLs:
// - La URL expira en X segundos (por defecto 2 horas)
// - La firma incluye la IP del usuario (opcional) — si cambia la IP, la URL no funciona
// - Si alguien comparte la URL, expira rápido y no sirve para siempre
//
// El proceso de firma:
// 1. Concatenamos: tokenKey + videoId + expirationTimestamp
// 2. Hasheamos con SHA256
// 3. Convertimos a base64 y limpiamos caracteres especiales
// 4. Armamos la URL con el hash y el timestamp como parámetros
export const generateSignedUrl = (videoId: string, expiresInSeconds = 7200): string => {
  // Calculamos cuándo expira (timestamp Unix en segundos)
  const expiration = Math.floor(Date.now() / 1000) + expiresInSeconds

  // Armamos el string a hashear: tokenKey + videoId + expiration
  const hashableBase = `${bunnyConfig.tokenKey}${videoId}${expiration}`

  // Generamos el hash SHA256 y lo convertimos a base64 URL-safe
  const token = crypto
    .createHash('sha256')
    .update(hashableBase)
    .digest('base64')
    .replace(/\+/g, '-')   // base64 usa + pero las URLs usan -
    .replace(/\//g, '_')   // base64 usa / pero las URLs usan _
    .replace(/=/g, '')     // sacamos el padding de base64

  // Armamos la URL final del CDN con el token y la expiración
  return `https://${bunnyConfig.cdnHostname}/${videoId}/play.mp4?token=${token}&expires=${expiration}`
}

// ── URL del thumbnail ──────────────────────────────────────────

// getThumbnailUrl: devuelve la URL del thumbnail que Bunny genera automáticamente
// Bunny.net genera el thumbnail del video automáticamente al procesar
// No necesita firma porque las miniaturas son públicas (no revelan contenido protegido)
export const getThumbnailUrl = (videoId: string): string => {
  return `https://${bunnyConfig.cdnHostname}/${videoId}/thumbnail.jpg`
}