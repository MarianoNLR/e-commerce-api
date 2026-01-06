import app from './index.js'
import { connectDB } from './mongo.js'

const PORT = process.env.PORT ?? 3000
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ecommerce'
await connectDB(MONGODB_URI)

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`)
})