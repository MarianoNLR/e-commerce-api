import express from 'express'
import { getAll, addCategory, getCategoryById ,deleteCategory, updateCategory } from '../controllers/categoryController.js'

const categoryRouter = express.Router()

categoryRouter.get('/', getAll)
categoryRouter.post('/', addCategory)
categoryRouter.get('/:categoryId', getCategoryById)
categoryRouter.delete('/:categoryId', deleteCategory)
categoryRouter.put('/:categoryId', updateCategory)

export default categoryRouter
