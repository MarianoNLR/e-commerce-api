import express from 'express'
import { add, deleteProduct, getAll, getById, update, getBySearch } from '../controllers/productController.js'
import { authUser } from '../middlewares/authUser.js'
import { dirname, join, extname } from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url))
const MIMETYPES = ['image/jpeg', 'image/png']

const multerUpload = multer({
  storage: multer.diskStorage({
    destination: join(CURRENT_DIR, '../uploads'),
    filename: (req, file, cb) => {
      const fileExtension = extname(file.originalname)
      const fileName = file.originalname.split(fileExtension)[0]
      cb(null, `${fileName}-${Date.now()}${fileExtension}`)
    }
  }),
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
  multerUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message })
    }

    add(req, res)
  })
})
productRouter.delete('/:id', authUser, deleteProduct)
productRouter.get('/product/:productId', getById)
productRouter.get('/search/', getBySearch)
productRouter.get('/:categoryId', getAll)
productRouter.get('/', getAll)
productRouter.patch('/:id', authUser, update)

export default productRouter
