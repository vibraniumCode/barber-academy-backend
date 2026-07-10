import { Request } from 'express'
import { JwtPayload } from 'jsonwebtoken'
import { Types } from 'mongoose'

export interface AuthPayload extends JwtPayload {
  id: string
  role: string
}

export interface AuthRequest extends Request {
  user?: {
    _id: Types.ObjectId
    name: string
    email: string
    role: string
    stripeCustomerId?: string | null
    isActive: boolean
  }
}