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
  }
})

productSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Product = model('products', productSchema)

export default Product
