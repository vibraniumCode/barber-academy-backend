import mongoose from 'mongoose'

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string)
    console.log('✅ MongoDB conectado')
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', (err as Error).message)
    process.exit(1)
  }
}