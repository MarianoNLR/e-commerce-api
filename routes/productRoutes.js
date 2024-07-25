import express from 'express'
import { add, deleteProduct, getAll, getById, update } from '../controllers/productController.js'
import { authUser } from '../middlewares/authUser.js'

const productRouter = express.Router()

productRouter.post('/', authUser, add)
productRouter.delete('/:id', authUser, deleteProduct)
productRouter.get('/', getAll)
productRouter.get('/:id', getById)
productRouter.patch('/:id', authUser, update)

export default productRouter
