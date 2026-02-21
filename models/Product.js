import { Schema, model } from 'mongoose'

const productSchema = new Schema({
  name: {
    type: String
  },
  price: {
    type: Number
  },
  quantity: {
    type: Number
  },
  images: [{
    _id: false,
    public_id: String,
    secure_url: String
  }],
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category'
  },
  description: {
    type: String
  }
})

productSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Product = model('Product', productSchema)

export default Product
