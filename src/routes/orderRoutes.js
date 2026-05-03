import { Router } from 'express'
import multer from 'multer'
import { authUser } from '../middlewares/authUser.js'
import { defineAbilityMiddleware } from '../middlewares/ability.js'
import { checkAbility } from '../middlewares/checkAbility.js'
import { BadRequestError } from '../errors/BadRequestError.js'
import { getOrders, getOrderById, updateOrderStatus, updateOrder, createOrder, uploadPaymentProof } from '../controllers/orderController.js'

const orderRouter = Router()
const PAYMENT_PROOF_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const paymentProofUpload = multer({
	storage: multer.memoryStorage(),
	fileFilter: (req, file, cb) => {
		if (PAYMENT_PROOF_MIMETYPES.includes(file.mimetype)) cb(null, true)
		else cb(new Error(`File must be one of the following types: ${PAYMENT_PROOF_MIMETYPES.join(', ')}`))
	},
	limits: {
		fileSize: 10 * 1024 * 1024 // 10 MB
	}
})

orderRouter.use(authUser, defineAbilityMiddleware)

orderRouter.get('/', checkAbility('read', 'Order'), getOrders)
orderRouter.get('/:orderId', checkAbility('read', 'Order'), getOrderById)

orderRouter.post('/', checkAbility('create', 'Order'), createOrder)

orderRouter.put('/:orderId/status', checkAbility('update', 'Order'), updateOrderStatus)
orderRouter.put('/:orderId', checkAbility('update', 'Order'), updateOrder)

orderRouter.post('/:orderId/payment_proof', checkAbility('update', 'Order'), (req, res, next) => {
	paymentProofUpload.single('image')(req, res, (err) => {
		if (err) {
            console.error('Payment proof upload error:', err)
			return next(new BadRequestError(err.message))
		}

		uploadPaymentProof(req, res, next)
	})
})

export default orderRouter
