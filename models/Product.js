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
  imageURL: {
    type: String
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
