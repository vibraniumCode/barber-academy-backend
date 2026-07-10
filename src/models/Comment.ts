import mongoose, { Document, Schema } from 'mongoose'

export interface IComment extends Document {
  lesson: mongoose.Types.ObjectId
  course: mongoose.Types.ObjectId
  author: mongoose.Types.ObjectId
  content: string
  parent: mongoose.Types.ObjectId | null
  isInstructorReply: boolean
  likes: mongoose.Types.ObjectId[]
  isVisible: boolean
}

const commentSchema = new Schema<IComment>({
  lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 1000 },
  parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  isInstructorReply: { type: Boolean, default: false },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isVisible: { type: Boolean, default: true }
}, { timestamps: true })

commentSchema.index({ lesson: 1, createdAt: -1 })

export default mongoose.model<IComment>('Comment', commentSchema)