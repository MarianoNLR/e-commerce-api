import express from 'express'
import { add, deleteProduct, getAll, getById, update } from '../controllers/productController.js'

const productRouter = express.Router()

productRouter.post('/', add)
productRouter.delete('/:id', deleteProduct)
productRouter.get('/', getAll)
productRouter.get('/:id', getById)
productRouter.patch('/:id', update)

export default productRouter
