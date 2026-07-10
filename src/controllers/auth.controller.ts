import { Request, Response } from 'express'
import User from '../models/User'
import { signToken } from '../utils/jwt'
import { AuthRequest } from '../types'

// Helper interno: genera el token y arma la respuesta estándar de auth
// Lo usamos en register, login y changePassword para no repetir código
const sendAuthResponse = (res: Response, user: InstanceType<typeof User>, statusCode = 200): void => {
  // Generamos el token con el ID y rol del usuario
  const token = signToken({ id: user._id.toString(), role: user.role })

  res.status(statusCode).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    }
  })
}

// POST /api/auth/register
// Crea una cuenta nueva de estudiante
// No requiere autenticación — cualquiera puede registrarse
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body

    // Verificamos que el email no esté ya registrado
    const exists = await User.findOne({ email })
    if (exists) {
      res.status(400).json({ message: 'El email ya está registrado' })
      return
    }

    // Creamos el usuario — el hook pre('save') del modelo hashea la contraseña automáticamente
    const user = await User.create({ name, email, password })
    sendAuthResponse(res, user, 201)
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// POST /api/auth/login
// Verifica las credenciales y devuelve un token si son correctas
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ message: 'Email y contraseña son requeridos' })
      return
    }

    // Buscamos el usuario incluyendo la contraseña hasheada
    // (select: false en el modelo la excluye por defecto, la pedimos explícitamente acá)
    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: 'Credenciales incorrectas' })
      return
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Cuenta desactivada' })
      return
    }

    sendAuthResponse(res, user)
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// GET /api/auth/me
// Devuelve los datos del usuario actualmente logueado
// req.user lo carga el middleware protect antes de llegar acá
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ user: req.user })
}

// PATCH /api/auth/me
// Actualiza nombre y avatar del usuario logueado
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, avatar } = req.body
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { name, avatar },
      { new: true, runValidators: true } // new: true devuelve el documento actualizado
    )
    res.json({ user })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

// PATCH /api/auth/password
// Cambia la contraseña — requiere la contraseña actual para confirmar identidad
// (medida de seguridad: si alguien roba tu sesión, no puede cambiar la contraseña sin saber la actual)
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body

    // Buscamos el usuario con la contraseña (que normalmente está oculta)
    const user = await User.findById(req.user?._id).select('+password')
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' })
      return
    }

    // Verificamos que la contraseña actual sea correcta
    if (!(await user.comparePassword(currentPassword))) {
      res.status(400).json({ message: 'Contraseña actual incorrecta' })
      return
    }

    // Asignamos la nueva — el hook pre('save') la hashea automáticamente
    user.password = newPassword
    await user.save()
    sendAuthResponse(res, user)
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}