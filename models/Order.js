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
