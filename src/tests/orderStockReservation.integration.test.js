import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import jwt from 'jsonwebtoken'

import app from '../index.js'
import Cart from '../models/Cart.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import { expirePendingOrders } from '../jobs/orderExpiration.js'

let mongoServer

const shippingInfo = {
  name: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '5551234567',
  address: 'Calle Principal 123',
  city: 'Buenos Aires',
  state: 'Buenos Aires',
  zip: '1000',
  observations: 'Timbre B'
}

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  await mongoose.connect(mongoServer.getUri())
})

afterEach(async () => {
  await mongoose.connection.dropDatabase()
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

function createToken (user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || 'testsecret',
    { expiresIn: '1h' }
  )
}

async function createCheckoutFixture ({ stock = 10, cartQuantity = 2 } = {}) {
  const uniqueSuffix = `${Date.now()}-${Math.random()}`
  const user = await User.create({
    name: 'Checkout',
    lastName: 'Tester',
    email: `checkout-${uniqueSuffix}@example.com`,
    password: 'password123',
    role: 'user'
  })

  const product = await Product.create({
    name: 'Producto de reserva',
    description: 'Producto usado para probar reservas de stock',
    price: 125,
    quantity: stock
  })

  const cart = await Cart.create({
    user: user._id,
    items: [{ product: product._id, quantity: cartQuantity }],
    totalPrice: product.price * cartQuantity
  })

  return { user, product, cart, token: createToken(user) }
}

async function createOrderThroughApi (token) {
  return await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ shipping_info: shippingInfo })
}

describe('Order stock reservations', () => {
  it('creates an order by reserving stock and clearing the cart', async () => {
    const { user, product, token } = await createCheckoutFixture({ stock: 10, cartQuantity: 2 })

    const response = await createOrderThroughApi(token)

    expect(response.status).toBe(201)

    const orderId = response.body.data.newOrder.id
    const order = await Order.findById(orderId)
    const productAfterOrder = await Product.findById(product._id)
    const cartAfterOrder = await Cart.findOne({ user: user._id })

    expect(order).not.toBeNull()
    expect(order.status).toBe('pending_payment')
    expect(order.items).toHaveLength(1)
    expect(order.items[0].productId.toString()).toBe(product._id.toString())
    expect(order.items[0].quantity).toBe(2)
    expect(productAfterOrder.quantity).toBe(8)
    expect(cartAfterOrder).toBeNull()
  })

  it('rejects an order with insufficient stock without changing stock, cart, or orders', async () => {
    const { user, product, cart, token } = await createCheckoutFixture({ stock: 1, cartQuantity: 2 })

    const response = await createOrderThroughApi(token)

    // Insufficient inventory is a client error, not an internal server failure.
    expect(response.status).toBe(400)

    const productAfterAttempt = await Product.findById(product._id)
    const cartAfterAttempt = await Cart.findById(cart._id)
    const ordersAfterAttempt = await Order.find({ user: user._id })

    expect(productAfterAttempt.quantity).toBe(1)
    expect(cartAfterAttempt).not.toBeNull()
    expect(cartAfterAttempt.items).toHaveLength(1)
    expect(cartAfterAttempt.items[0].quantity).toBe(2)
    expect(ordersAfterAttempt).toHaveLength(0)
  })

  it('releases the reserved stock when a user cancels a pending order', async () => {
    const { product, token } = await createCheckoutFixture({ stock: 10, cartQuantity: 2 })
    const createResponse = await createOrderThroughApi(token)
    const orderId = createResponse.body.data.newOrder.id

    const cancelResponse = await request(app)
      .put(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' })

    expect(cancelResponse.status).toBe(200)

    const cancelledOrder = await Order.findById(orderId)
    const productAfterCancellation = await Product.findById(product._id)

    expect(cancelledOrder.status).toBe('cancelled')
    expect(productAfterCancellation.quantity).toBe(10)
  })

  it('does not release stock more than once when cancellation is requested twice', async () => {
    const { product, token } = await createCheckoutFixture({ stock: 10, cartQuantity: 2 })
    const createResponse = await createOrderThroughApi(token)
    const orderId = createResponse.body.data.newOrder.id

    const firstCancellation = await request(app)
      .put(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' })

    expect(firstCancellation.status).toBe(200)

    // A duplicate delivery may return a no-op or a transition error. In either
    // case it must never return the same reservation twice.
    await request(app)
      .put(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' })

    const productAfterDuplicateCancellation = await Product.findById(product._id)
    expect(productAfterDuplicateCancellation.quantity).toBe(10)
  })

  it('expires a reserved order only once when the expiration job runs twice', async () => {
    const { user, product, token } = await createCheckoutFixture({ stock: 10, cartQuantity: 2 })
    const createResponse = await createOrderThroughApi(token)
    const orderId = createResponse.body.data.newOrder.id

    await Order.findByIdAndUpdate(orderId, {
      expires_at: new Date(Date.now() - 60 * 1000)
    })

    await expirePendingOrders()
    await expirePendingOrders()

    const expiredOrder = await Order.findById(orderId)
    const productAfterTwoExpirationRuns = await Product.findById(product._id)
    const cartAfterExpiration = await Cart.findOne({ user: user._id })

    expect(expiredOrder.status).toBe('expired')
    expect(productAfterTwoExpirationRuns.quantity).toBe(10)
    expect(cartAfterExpiration).toBeNull()
  })
})
