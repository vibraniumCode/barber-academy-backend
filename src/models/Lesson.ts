import mongoose, { Document, Schema } from 'mongoose'

export interface ILesson extends Document {
  module: mongoose.Types.ObjectId
  course: mongoose.Types.ObjectId
  title: string
  description: string
  order: number
  duration: number
  video: {
    bunnyVideoId: string
    bunnyCdnUrl: string
    status: 'processing' | 'ready' | 'error'
  }
  isFree: boolean
  isPublished: boolean
}

const lessonSchema = new Schema<ILesson>({
  module: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  order: { type: Number, required: true, default: 0 },
  duration: { type: Number, default: 0 },
  video: {
    bunnyVideoId: { type: String, default: '' },
    bunnyCdnUrl: { type: String, default: '' },
    status: { type: String, enum: ['processing', 'ready', 'error'], default: 'processing' }
  },
  isFree: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false }
}, { timestamps: true })

lessonSchema.index({ module: 1, order: 1 })
lessonSchema.index({ course: 1 })

export default mongoose.model<ILesson>('Lesson', lessonSchema)