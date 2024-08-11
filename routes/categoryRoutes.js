import express from 'express'
import { getAll, addCategory } from '../controllers/categoryController.js'

const categoryRouter = express.Router()

categoryRouter.get('/', getAll)
categoryRouter.post('/', addCategory)

export default categoryRouter
