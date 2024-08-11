import { Schema, model } from 'mongoose'

const categorySchema = new Schema({
  name: {
    type: String
  }
})

categorySchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Category = model('Category', categorySchema)

export default Category
