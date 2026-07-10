import mongoose, { Document, Schema } from 'mongoose'

export interface ICourse extends Document {
  title: string
  slug: string
  description: string
  shortDescription: string
  thumbnail: string
  trailer: {
    bunnyVideoId: string
    bunnyCdnUrl: string
  }
  instructor: mongoose.Types.ObjectId
  price: number
  currency: string
  level: 'beginner' | 'intermediate' | 'advanced'
  language: string
  tags: string[]
  isPublished: boolean
  isFeatured: boolean
  totalDuration: number
  totalLessons: number
  enrollmentCount: number
  rating: number
  reviewsCount: number
  stripeProductId: string | null
  stripePriceId: string | null
}

const courseSchema = new Schema<ICourse>({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  shortDescription: { type: String, maxlength: 200 },
  thumbnail: { type: String, default: '' },
  trailer: {
    bunnyVideoId: { type: String, default: '' },
    bunnyCdnUrl: { type: String, default: '' }
  },
  instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  language: { type: String, default: 'es' },
  tags: [{ type: String }],
  isPublished: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  totalDuration: { type: Number, default: 0 },
  totalLessons: { type: Number, default: 0 },
  enrollmentCount: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewsCount: { type: Number, default: 0 },
  stripeProductId: { type: String, default: null },
  stripePriceId: { type: String, default: null }
}, { timestamps: true })

export default mongoose.model<ICourse>('Course', courseSchema)