import { Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { AuthRequest } from '../types'
import User from '../models/User'

// protect: middleware que protege rutas privadas
// Se ejecuta ANTES del controller en cada ruta que requiera login
// Si el token no existe, es inválido o expiró → rechaza la request con 401
// Si el token es válido → carga el usuario en req.user y deja pasar
export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Buscar el token en el header Authorization (formato: "Bearer eltoken")
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No autorizado — falta el token' })
      return
    }

    // 2. Extraer solo el token (sacar la palabra "Bearer ")
    const token = auth.split(' ')[1]

    // 3. Verificar que el token sea válido y no haya expirado
    const decoded = verifyToken(token)

    // 4. Buscar el usuario real en la base de datos
    // (por si fue desactivado después de que generó el token)
    const user = await User.findById(decoded.id).select('-password')
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Usuario no encontrado o inactivo' })
      return
    }

    // 5. Adjuntar el usuario al request para que lo usen los controllers
    req.user = user as AuthRequest['user']
    next() // todo bien, seguir al controller
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' })
  }
}