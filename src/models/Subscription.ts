import mongoose, { Document, Schema } from 'mongoose'

export interface ISubscription extends Document {
  student: mongoose.Types.ObjectId
  stripeSubscriptionId: string
  stripeCustomerId: string
  status: 'active' | 'past_due' | 'cancelled' | 'incomplete' | 'trialing'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

const subscriptionSchema = new Schema<ISubscription>({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  stripeSubscriptionId: { type: String, required: true, unique: true },
  stripeCustomerId: { type: String, required: true },
  status: {
    type: String,
    enum: ['active', 'past_due', 'cancelled', 'incomplete', 'trialing'],
    default: 'active'
  },
  currentPeriodStart: { type: Date },
  currentPeriodEnd: { type: Date },
  cancelAtPeriodEnd: { type: Boolean, default: false }
}, { timestamps: true })

export default mongoose.model<ISubscription>('Subscription', subscriptionSchema)