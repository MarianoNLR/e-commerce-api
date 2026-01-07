import mongoose from 'mongoose'

export async function connectDB(uri) {
  if (mongoose.connection.readyState >= 1) return

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

  console.log('Database connected')
}

export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return
  await mongoose.disconnect()
  console.log('Database disconnected')
}
