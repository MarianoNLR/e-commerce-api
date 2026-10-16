import { Schema, model } from 'mongoose'
import { PAYMENT_METHOD_VALUES } from '../lib/paymentMethods.js'
import { ORDER_STATUSES, ORDER_STATUS_VALUES } from '../lib/orderStatuses.js'

const OrderItemSnapshotSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
  },
  priceAtPurchase: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
 }, { _id: false })

const orderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: [OrderItemSnapshotSchema],
  total: {
    type: Number,
    required: true,
    default: 0
  },
  payment_id: {
    type: String
  },
  payment_method: {
    type: String,
    enum: PAYMENT_METHOD_VALUES,
    required: true
  },
  payment_preference_id: {
    type: String
  },
  status: {
    type: String,
    enum: ORDER_STATUS_VALUES,
    default: ORDER_STATUSES.PENDING_PAYMENT
  },
  proof_of_payment_url: {
    type: String
  },
  expires_at: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 60 * 1000)
  },
  shipping_info: {
    name: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    zip: {
      type: String,
      required: true
    },
    observations: {
      type: String
    }
  }

}, { timestamps: true })

orderSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Order = model('Order', orderSchema)

export default Order
