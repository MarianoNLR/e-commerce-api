import { Schema, model } from 'mongoose'
import uniqueValidator from 'mongoose-unique-validator'

const userSchema = new Schema({
  username: {
    type: String,
    unique: true
  },
  password: String,
  role: String
})

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id
    delete returnedObject._id
    delete returnedObject.__v
  }
})

userSchema.plugin(uniqueValidator)

const User = model('users', userSchema)

export default User
