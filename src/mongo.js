import mongoose from 'mongoose'

function getMongoURI() {
  const env = process.env.NODE_ENV

  if (env === 'production') {
    return process.env.MONGODB_URI_PROD
  } else if (env === 'test') {
    return process.env.MONGODB_URI_TEST
  }

  return process.env.MONGODB_URI_DEV
}

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return

  const uri = getMongoURI()

  if (!uri) {
    throw new Error('MongoDB URI not defined for the current environment.')
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

  console.log(`Database connected (${process.env.NODE_ENV})`)
}

export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return
  await mongoose.disconnect()
  console.log(`Database disconnected (${process.env.NODE_ENV})`)
}
