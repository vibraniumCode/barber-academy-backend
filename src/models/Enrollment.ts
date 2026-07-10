import mongoose, { Document, Schema } from 'mongoose'

export interface IProgress {
  lesson: mongoose.Types.ObjectId
  completedAt: Date
}

export interface IEnrollment extends Document {
  student: mongoose.Types.ObjectId
  course: mongoose.Types.ObjectId
  type: 'purchase' | 'subscription'
  stripePaymentIntentId: string | null
  status: 'active' | 'refunded' | 'expired'
  progress: IProgress[]
  completedAt: Date | null
}

const enrollmentSchema = new Schema<IEnrollment>({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  type: { type: String, enum: ['purchase', 'subscription'], required: true },
  stripePaymentIntentId: { type: String, default: null },
  status: { type: String, enum: ['active', 'refunded', 'expired'], default: 'active' },
  progress: [{
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    completedAt: { type: Date }
  }],
  completedAt: { type: Date, default: null }
}, { timestamps: true })

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true })

export default mongoose.model<IEnrollment>('Enrollment', enrollmentSchema)