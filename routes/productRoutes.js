import express from 'express'
import { add, deleteProduct, getAll, getById, update, getBySearch, updateProductStock } from '../controllers/productController.js'
import { authUser } from '../middlewares/authUser.js'
import { checkAbility } from '../middlewares/checkAbility.js'
import { defineAbilityMiddleware } from '../middlewares/ability.js'
import { dirname, join, extname } from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import { validate } from '../middlewares/validate.js'
import { getBySearchSchema, getByIdSchema, addProductSchema, updateProductSchema, updateProductStockSchema, deleteProductSchema } from '../validators/product.schema.js'

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url))
const MIMETYPES = ['image/jpeg', 'image/png']

const multerUpload = multer({
  // storage: multer.diskStorage({
  //   destination: join(CURRENT_DIR, '../uploads'),
  //   filename: (req, file, cb) => {
  //     const fileExtension = extname(file.originalname)
  //     const fileName = file.originalname.split(fileExtension)[0]
  //     cb(null, `${fileName}-${Date.now()}${fileExtension}`)
  //   }
  // }),
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (MIMETYPES.includes(file.mimetype)) cb(null, true)
    else cb(new Error(`Image must be one of the following types ${MIMETYPES.join(' ')}`))
  },
  limits: {
    fieldSize: 10000000
  }
})

const productRouter = express.Router()

productRouter.post('/', (req, res, next) => {
  multerUpload.array('images')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message })
    }
    validate(addProductSchema)
    add(req, res)
  })
})
productRouter.delete('/:id', authUser, defineAbilityMiddleware, checkAbility('delete', 'Product'), validate(deleteProductSchema), deleteProduct)
productRouter.get('/product/:productId', validate(getByIdSchema), getById)
productRouter.get('/search/', validate(getBySearchSchema), getBySearch)
productRouter.get('/:categoryId', getAll)
productRouter.get('/', getAll)
productRouter.put('/:id', authUser, defineAbilityMiddleware, checkAbility('update', 'Product'), validate(updateProductSchema), (req, res, next) => {
  multerUpload.array('newImages')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message })
    }
    update(req, res)
  })
})
productRouter.patch('/stock/:productId', validate(updateProductStockSchema), updateProductStock)
//productRouter.post('/', authUser, defineAbilityMiddleware, checkAbility('create', 'Product'), add)

export default productRouter
