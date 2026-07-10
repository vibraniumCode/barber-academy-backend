import { config } from 'dotenv'
config() // ← esto va PRIMERO, antes de cualquier otro import

import app from './src/app'
import { connectDB } from './src/config/db'

const PORT = process.env.PORT || 3000

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
  })
})