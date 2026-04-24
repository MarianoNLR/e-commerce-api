import express from 'express'
import cors from 'cors'
import userRouter from './routes/userRoutes.js'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import productRouter from './routes/productRoutes.js'
import cartRouter from './routes/cartRoutes.js'
import categoryRouter from './routes/categoryRoutes.js'
import checkoutRouter from './routes/checkoutRoutes.js'
import orderRouter from './routes/orderRoutes.js'
import './config/passport.js'
import authRouter from './routes/authRoutes.js'
import { errorHandler } from './middlewares/errorHandler.js'
import v1Router from './routes/index.js'

const app = express()

const PORT = process.env.PORT ?? 3000

app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
// TODO: Handle CORS properly with environment variables and allowed origins
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: corsOrigins,
  credentials: true
}))

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const imageDirectory = join(__dirname, 'uploads')

app.use('/uploads', express.static(imageDirectory))

app.use('/api/v1', v1Router)

app.get('/', (req, res) => {
  res.send('<h1>Hello World!!</h1>')
})

app.use(errorHandler)

export default app

// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server listening on http://localhost:${PORT}`)
// })
