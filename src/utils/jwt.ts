import jwt from 'jsonwebtoken'
import { AuthPayload } from '../types'

// signToken: genera un token JWT con los datos del usuario
// El token es como un "carnet digital" que el cliente guarda
// y manda en cada request para demostrar que está autenticado
export const signToken = (payload: AuthPayload): string => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET as string,  // la clave secreta — solo tu servidor la conoce
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }  // el token expira en 7 días
  )
}

// verifyToken: verifica que un token sea válido y no haya expirado
// Si alguien modifica el token o usa uno vencido, esto lanza un error
export const verifyToken = (token: string): AuthPayload => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload
}