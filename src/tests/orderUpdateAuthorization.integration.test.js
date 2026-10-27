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

async function createUser (label, role = 'user') {
  const uniqueSuffix = `${label}-${Date.now()}-${Math.random()}`

  return await User.create({
    name: label,
    lastName: 'Tester',
    email: `${uniqueSuffix}@example.com`,
    password: 'password123',
    role
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
    payment_method: 'bank_transfer',
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

  it.each([
    ['status', { status: 'cancelled' }],
    ['total', { total: 1 }],
    ['items', { items: [] }],
    ['user', { user: new mongoose.Types.ObjectId().toString() }],
    ['payment method', { payment_method: 'mercadopago' }],
    ['payment ID', { payment_id: 'injected' }],
    ['preference ID', { payment_preference_id: 'injected' }],
    ['payment proof', { proof_of_payment_url: 'https://example.com/injected' }],
    ['expiration', { expires_at: '2030-01-01T00:00:00.000Z' }],
    ['MongoDB operator', { $set: { status: 'cancelled' } }],
    ['dotted field', { 'shipping_info.address': 'Injected address' }],
    ['unexpected nested field', { shipping_info: { ...shippingInfo, status: 'cancelled' } }],
    ['mixed allowed and protected fields', { shipping_info: shippingInfo, status: 'cancelled' }]
  ])('rejects an administrator changing %s through the generic endpoint', async (_label, payload) => {
    const admin = await createUser('Admin', 'admin')
    const customer = await createUser('Customer')
    const order = await createPendingOrder(customer)
    const before = (await Order.findById(order._id)).toObject()

    const response = await request(app)
      .put(`/api/v1/orders/${order._id}`)
      .set('Authorization', `Bearer ${createToken(admin)}`)
      .send(payload)

    expect(response.status).toBe(400)
    expect((await Order.findById(order._id)).toObject()).toEqual(before)
  })

  it('allows an administrator to update shipping information through the generic endpoint', async () => {
    const admin = await createUser('Admin', 'admin')
    const customer = await createUser('Customer')
    const order = await createPendingOrder(customer)
    const updatedShipping = { ...shippingInfo, address: 'Nueva direccion 456' }

    const response = await request(app)
      .put(`/api/v1/orders/${order._id}`)
      .set('Authorization', `Bearer ${createToken(admin)}`)
      .send({ shipping_info: updatedShipping })

    expect(response.status).toBe(200)
    expect((await Order.findById(order._id)).shipping_info.address).toBe(updatedShipping.address)
  })

  it.each([
    ['missing required field', { ...shippingInfo, address: undefined }],
    ['empty required field', { ...shippingInfo, address: '' }],
    ['incorrect field type', { ...shippingInfo, phone: 12345 }],
    ['non-object shipping information', 'invalid']
  ])('rejects %s without changing the order', async (_label, shippingInfoInput) => {
    const admin = await createUser('Admin', 'admin')
    const customer = await createUser('Customer')
    const order = await createPendingOrder(customer)
    const before = (await Order.findById(order._id)).toObject()

    const response = await request(app)
      .put(`/api/v1/orders/${order._id}`)
      .set('Authorization', `Bearer ${createToken(admin)}`)
      .send({ shipping_info: shippingInfoInput })

    expect(response.status).toBe(400)
    expect((await Order.findById(order._id)).toObject()).toEqual(before)
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

  it('allows a user to cancel their own pending order through the cancel endpoint', async () => {
    const userA = await createUser('User A')
    const order = await createPendingOrder(userA)

    const response = await request(app)
      .post(`/api/v1/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${createToken(userA)}`)

    const orderAfterCancellation = await Order.findById(order._id)

    expect(response.status).toBe(200)
    expect(orderAfterCancellation.status).toBe('cancelled')
  })

  it('does not allow a user to cancel another user\'s pending order', async () => {
    const userA = await createUser('User A')
    const userB = await createUser('User B')
    const orderB = await createPendingOrder(userB)

    const response = await request(app)
      .post(`/api/v1/orders/${orderB._id}/cancel`)
      .set('Authorization', `Bearer ${createToken(userA)}`)

    const orderAfterAttempt = await Order.findById(orderB._id)

    expect(response.status).toBe(404)
    expect(orderAfterAttempt.status).toBe('pending_payment')
  })

  it('allows a moderator to update an order status through the staff endpoint', async () => {
    const moderator = await createUser('Moderator', 'moderator')
    const customer = await createUser('Customer')
    const order = await createPendingOrder(customer, { payment_method: 'mercadopago' })

    const response = await request(app)
      .put(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${createToken(moderator)}`)
      .send({ status: 'paid' })

    const orderAfterUpdate = await Order.findById(order._id)

    expect(response.status).toBe(200)
    expect(orderAfterUpdate.status).toBe('paid')
  })
})
