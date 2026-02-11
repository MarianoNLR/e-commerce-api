import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { connectDB, disconnectDB } from '../mongo.js'

import User from '../models/User.js'
import Product from '../models/Product.js'
import Cart from '../models/Cart.js'
import Order from '../models/Order.js'

process.env.NODE_ENV = 'development'

await connectDB()

await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Cart.deleteMany({}),
    Order.deleteMany({})
])

const hashedPassword = await bcrypt.hash('password123', 10)

const user = await User.create({
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: hashedPassword
})

const product1 = await Product.create({
    name: 'Product 1',
    description: 'Description for product 1',
    price: 19.99,
    quantity: 100
})

const product2 = await Product.create({
    name: 'Product 2',
    description: 'Description for product 2',
    price: 29.99,
    quantity: 50
})

await Cart.create({
    user: user._id,
    items: [
        {
            product: product1._id,
            quantity: 2
        }, 
        {
            product: product2._id,
            quantity: 1
        }
    ]
})
console.log('Database seeded successfully.')
await disconnectDB()
process.exit(0)