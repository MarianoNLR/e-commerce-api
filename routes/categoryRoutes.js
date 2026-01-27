import express from 'express'
import { getAll, addCategory, getCategoryById ,deleteCategory, updateCategory } from '../controllers/categoryController.js'
import { validate } from '../middlewares/validate.js'
import { getByIdSchema, addCategorySchema, deleteCategorySchema, updateCategorySchema} from '../schemas/categorySchema.js'

const categoryRouter = express.Router()

categoryRouter.get('/', getAll)
categoryRouter.post('/', validate(addCategorySchema), addCategory)
categoryRouter.get('/:categoryId', validate(getByIdSchema), getCategoryById)
categoryRouter.delete('/:categoryId', validate(deleteCategorySchema), deleteCategory)
categoryRouter.put('/:categoryId', validate(updateCategorySchema), updateCategory)

export default categoryRouter
