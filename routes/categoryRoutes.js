import express from 'express'
import { getAll } from '../controllers/categoryController.js'

const categoryRouter = express.Router()

categoryRouter.get('/category', getAll)

export default categoryRouter
