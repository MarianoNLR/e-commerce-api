import { Schema, model } from 'mongoose'

const orderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  products: [{
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  total: {
    type: Number,
    required: true,
    default: 0
  },
  payment_id: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending_payment', 'paid', 'shipped', 'cancelled'],
    default: 'pending_payment'
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
