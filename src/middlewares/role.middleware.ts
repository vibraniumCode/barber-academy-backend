import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'

// restrictTo: middleware que limita el acceso por rol
// Uso: restrictTo('admin') o restrictTo('admin', 'instructor')
// Si el usuario logueado no tiene uno de esos roles → rechaza con 403 (Forbidden)
// Es como un portero que además de pedir el carnet (protect),
// verifica que tenés el nivel de acceso correcto
export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'No tenés permiso para realizar esta acción' })
      return
    }
    next()
  }
}