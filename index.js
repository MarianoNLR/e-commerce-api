import express from 'express'
import cors from 'cors'
import userRouter from './routes/userRoutes.js'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import './mongo.js'
import productRouter from './routes/productRoutes.js'
import cartRouter from './routes/cartRoutes.js'

const app = express()

const PORT = process.env.PORT ?? 3000

app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const imageDirectory = join(__dirname, 'uploads')

app.use('/uploads', express.static(imageDirectory))

app.use('/users', userRouter)
app.use('/products', productRouter)
app.use('/cart', cartRouter)

app.get('/', (req, res) => {
  res.send('<h1>Hello World!!</h1>')
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
