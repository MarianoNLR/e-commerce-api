import express from 'express'
import userRouter from './routes/userRoutes.js'
import bodyParser from 'body-parser'
import './mongo.js'

const app = express()

const PORT = process.env.PORT ?? 3000

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use('/users', userRouter)

app.get('/', (req, res) => {
  res.send('<h1>Hello World!!</h1>')
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
