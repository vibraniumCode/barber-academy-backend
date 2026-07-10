import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import authRoutes from './routes/auth.routes'
import courseRoutes from './routes/course.routes'
import videoRoutes from './routes/video.routes'
import paymentRoutes from './routes/payment.routes'
import commentRoutes from './routes/comment.routes'
import instructorRoutes from './routes/instructor.routes'
import studentRoutes from './routes/student.routes'
import publicRoutes from './routes/public.routes'

const app: Application = express()

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(morgan('dev'))

app.use('/api/auth', authRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/video', videoRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/instructor', instructorRoutes)
app.use('/api/student', studentRoutes)
app.use('/api/public', publicRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', project: 'BarberAcademy' })
})

export default app