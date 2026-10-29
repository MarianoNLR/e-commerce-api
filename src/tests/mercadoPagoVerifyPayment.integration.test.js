import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import jwt from 'jsonwebtoken'

const mpState = vi.hoisted(() => ({
  status: 'approved',
  transactionAmount: 0,
  externalReference: null
}))

const paymentGetMock = vi.hoisted(() =>
  vi.fn(async ({ id }) => ({
    status: mpState.status,
    transaction_amount: mpState.transactionAmount,
    id: String(id),
    external_reference: mpState.externalReference
  }))
)

vi.mock('mercadopago', () => ({
  MercadoPagoConfig: class MercadoPagoConfig {},
  Preference: class Preference {},
  Payment: class Payment {
    async get (payload) {
      return await paymentGetMock(payload)
    }

    async search () {
      return { results: [] }
    }
  }
}))

vi.mock('../emailController/emailController.js', () => ({
  sendOrderEmail: vi.fn(async () => undefined)
}))

import app from '../index.js'
import Cart from '../models/Cart.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import { sendOrderEmail } from '../emailController/emailController.js'

let mongoServer

const shippingInfo = {
  name: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '5551234567',
  address: 'Calle Principal 123',
  city: 'Buenos Aires',
  state: 'Buenos Aires',
  zip: '1000'
}

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  await mongoose.connect(mongoServer.getUri())
})

afterEach(async () => {
  await mongoose.connection.dropDatabase()
  mpState.status = 'approved'
  mpState.transactionAmount = 0
  mpState.externalReference = null
  paymentGetMock.mockClear()
  vi.mocked(sendOrderEmail).mockClear()
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
  return await User.create({
    name: 'Verify',
    lastName: 'Tester',
    email: `verify-${label}-${Date.now()}-${Math.random()}@example.com`,
    password: 'password123',
    role: 'user'
  })
}

async function createOrderFor (user) {
  const product = await Product.create({
    name: 'Producto verificacion',
    description: 'Producto usado para probar la verificacion al volver de la pasarela',
    price: 125,
    quantity: 10
  })
  await Cart.create({
    user: user._id,
    items: [{ product: product._id, quantity: 2 }],
    totalPrice: 250
  })

  const response = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${createToken(user)}`)
    .send({ shipping_info: shippingInfo, payment_method: 'mercadopago' })
  expect(response.status).toBe(201)

  const order = await Order.findById(response.body.data.newOrder.id)
  mpState.externalReference = order._id.toString()
  mpState.transactionAmount = order.total
  return { order, product }
}

function verify (user, body) {
  return request(app)
    .post('/api/v1/checkout/verify-payment')
    .set('Authorization', `Bearer ${createToken(user)}`)
    .send(body)
}

describe('Verifying a Mercado Pago payment when the buyer returns from the gateway', () => {
  it('requires authentication', async () => {
    const response = await request(app).post('/api/v1/checkout/verify-payment').send({ payment_id: '1', order_id: '1' })
    expect(response.status).toBe(401)
  })

  it('marks the order as paid without waiting for the webhook', async () => {
    const user = await createUser('paid')
    const { order } = await createOrderFor(user)

    const response = await verify(user, { payment_id: 'approved-on-return', order_id: order._id.toString() })

    expect(response.status).toBe(200)
    expect(response.body.data.result.status).toBe('paid')
    const current = await Order.findById(order._id)
    expect(current.status).toBe('paid')
    expect(current.payment_id).toBe('approved-on-return')
    expect(sendOrderEmail).toHaveBeenCalledTimes(1)
  })

  it('is idempotent when the same payment is verified twice', async () => {
    const user = await createUser('twice')
    const { order } = await createOrderFor(user)
    const body = { payment_id: 'verified-twice', order_id: order._id.toString() }

    expect((await verify(user, body)).status).toBe(200)
    const second = await verify(user, body)

    expect(second.status).toBe(200)
    expect(second.body.data.result.status).toBe('paid')
    expect(sendOrderEmail).toHaveBeenCalledTimes(1)
  })

  it('keeps the order pending when the payment is still in process', async () => {
    const user = await createUser('pending')
    const { order } = await createOrderFor(user)
    mpState.status = 'pending'

    const response = await verify(user, { payment_id: 'still-pending', order_id: order._id.toString() })

    expect(response.status).toBe(200)
    expect(response.body.data.result.status).toBe('pending_payment')
    expect((await Order.findById(order._id)).payment_id).toBe('still-pending')
  })

  it('marks the order as failed and restores stock when the payment was rejected', async () => {
    const user = await createUser('rejected')
    const { order, product } = await createOrderFor(user)
    mpState.status = 'rejected'

    const response = await verify(user, { payment_id: 'rejected-on-return', order_id: order._id.toString() })

    expect(response.status).toBe(200)
    expect(response.body.data.result.status).toBe('payment_failed')
    expect((await Product.findById(product._id)).quantity).toBe(10)
  })

  it('does not let another user verify an order that is not theirs', async () => {
    const owner = await createUser('owner')
    const stranger = await createUser('stranger')
    const { order } = await createOrderFor(owner)

    const response = await verify(stranger, { payment_id: 'not-mine', order_id: order._id.toString() })

    expect(response.status).toBe(404)
    expect(paymentGetMock).not.toHaveBeenCalled()
    expect((await Order.findById(order._id)).status).toBe('pending_payment')
  })

  it('rejects a payment whose amount does not match the order without changing it', async () => {
    const user = await createUser('amount')
    const { order } = await createOrderFor(user)
    mpState.transactionAmount = order.total + 1

    const response = await verify(user, { payment_id: 'wrong-amount', order_id: order._id.toString() })

    expect(response.status).toBe(400)
    expect((await Order.findById(order._id)).status).toBe('pending_payment')
  })

  it('rejects a payment that belongs to a different order', async () => {
    const user = await createUser('reference')
    const { order } = await createOrderFor(user)
    mpState.externalReference = new mongoose.Types.ObjectId().toString()

    const response = await verify(user, { payment_id: 'other-order', order_id: order._id.toString() })

    expect(response.status).toBe(400)
    expect((await Order.findById(order._id)).status).toBe('pending_payment')
  })

  it('requires both identifiers', async () => {
    const user = await createUser('missing')
    const response = await verify(user, { payment_id: 'only-payment' })
    expect(response.status).toBe(400)
  })
})
