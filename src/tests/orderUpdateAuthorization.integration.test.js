import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import jwt from 'jsonwebtoken'

import app from '../index.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'

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

async function createUser (label) {
  const uniqueSuffix = `${label}-${Date.now()}-${Math.random()}`

  return await User.create({
    name: label,
    lastName: 'Tester',
    email: `${uniqueSuffix}@example.com`,
    password: 'password123',
    role: 'user'
  })
}

async function createPendingOrder (user, overrides = {}) {
  const product = await Product.create({
    name: `Producto ${Date.now()}-${Math.random()}`,
    description: 'Producto usado para probar permisos de actualización',
    price: 100,
    quantity: 10
  })

  return await Order.create({
    user: user._id,
    items: [{
      productId: product._id,
      name: product.name,
      description: product.description,
      priceAtPurchase: product.price,
      quantity: 2
    }],
    total: 200,
    shipping_info: shippingInfo,
    status: 'pending_payment',
    ...overrides
  })
}

function protectedOrderFields (order) {
  return {
    user: order.user.toString(),
    items: order.items.map(item => ({
      productId: item.productId.toString(),
      name: item.name,
      description: item.description,
      priceAtPurchase: item.priceAtPurchase,
      quantity: item.quantity
    })),
    total: order.total,
    payment_id: order.payment_id,
    status: order.status,
    shipping_info: order.shipping_info.toObject()
  }
}

describe('Order update authorization', () => {
  it('rejects sensitive field changes to a user\'s own pending order and preserves it', async () => {
    const userA = await createUser('User A')
    const userB = await createUser('User B')
    const order = await createPendingOrder(userA)
    const orderBeforeAttempt = await Order.findById(order._id)

    const response = await request(app)
      .put(`/api/v1/orders/${order._id}`)
      .set('Authorization', `Bearer ${createToken(userA)}`)
      .send({
        total: 1,
        items: [{
          productId: new mongoose.Types.ObjectId(),
          name: 'Producto inyectado',
          description: 'No debe poder cambiarse',
          priceAtPurchase: 1,
          quantity: 999
        }],
        payment_id: 'payment-injected-by-client',
        status: 'paid',
        user: userB._id
      })

    const orderAfterAttempt = await Order.findById(order._id)

    // Generic order updates must not let a buyer alter the amount, purchase
    // snapshot, payment data, state, or ownership of its own order.
    expect.soft(response.status).toBeOneOf([400, 403])
    expect(protectedOrderFields(orderAfterAttempt)).toEqual(protectedOrderFields(orderBeforeAttempt))
  })

  it('rejects a user attempting to update another user\'s order, including shipping info', async () => {
    const userA = await createUser('User A')
    const userB = await createUser('User B')
    const orderB = await createPendingOrder(userB)
    const orderBeforeAttempt = await Order.findById(orderB._id)

    const response = await request(app)
      .put(`/api/v1/orders/${orderB._id}`)
      .set('Authorization', `Bearer ${createToken(userA)}`)
      .send({
        shipping_info: {
          ...shippingInfo,
          address: 'Direccion que pertenece al usuario A'
        }
      })

    const orderAfterAttempt = await Order.findById(orderB._id)

    expect.soft(response.status).toBeOneOf([403, 404])
    expect(protectedOrderFields(orderAfterAttempt)).toEqual(protectedOrderFields(orderBeforeAttempt))
  })

  it.each(['paid', 'shipped'])('rejects a user forcing the %s status on a pending order', async (status) => {
    const userA = await createUser('User A')
    const order = await createPendingOrder(userA)

    const response = await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${createToken(userA)}`)
      .send({ status })

    const orderAfterAttempt = await Order.findById(order._id)

    // Payment confirmation and fulfilment come from trusted payment or
    // moderation flows, never from a buyer-controlled status request.
    expect.soft(response.status).toBeOneOf([400, 403])
    expect(orderAfterAttempt.status).toBe('pending_payment')
  })

  it('allows a user to cancel their own pending order through the status endpoint', async () => {
    const userA = await createUser('User A')
    const order = await createPendingOrder(userA)

    const response = await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${createToken(userA)}`)
      .send({ status: 'cancelled' })

    const orderAfterCancellation = await Order.findById(order._id)

    expect(response.status).toBe(200)
    expect(orderAfterCancellation.status).toBe('cancelled')
  })
})
