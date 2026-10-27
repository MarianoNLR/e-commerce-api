import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import jwt from 'jsonwebtoken'

const mpState = vi.hoisted(() => ({
  status: 'rejected',
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
  MercadoPagoConfig: class MercadoPagoConfig {
    constructor (config) {
      this.config = config
    }
  },
  Preference: class Preference {},
  Payment: class Payment {
    constructor (client) {
      this.client = client
    }

    async get (payload) {
      return await paymentGetMock(payload)
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
  zip: '1000',
  observations: 'Timbre B'
}

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  await mongoose.connect(mongoServer.getUri())
})

afterEach(async () => {
  await mongoose.connection.dropDatabase()
  mpState.status = 'rejected'
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

async function createReservedOrder () {
  const uniqueSuffix = `${Date.now()}-${Math.random()}`
  const user = await User.create({
    name: 'Checkout',
    lastName: 'Tester',
    email: `mp-stock-${uniqueSuffix}@example.com`,
    password: 'password123',
    role: 'user'
  })
  const product = await Product.create({
    name: 'Producto Mercado Pago',
    description: 'Producto usado para probar la liberacion por webhook',
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
  const productAfterReservation = await Product.findById(product._id)

  expect(order.status).toBe('pending_payment')
  expect(productAfterReservation.quantity).toBe(8)

  mpState.externalReference = order._id.toString()
  mpState.transactionAmount = order.total

  return { order, product }
}

async function sendWebhook (paymentId) {
  return await request(app)
    .post('/api/v1/checkout/webhook/mercadopago')
    .query({ type: 'payment', 'data.id': paymentId })
}

describe('Mercado Pago webhooks that release reserved stock', () => {
  it('preserves a new cart when a previous order payment is approved', async () => {
    const { order, product } = await createReservedOrder()
    expect(await Cart.findOne({ user: order.user })).toBeNull()

    const newProduct = await Product.create({
      name: 'Producto para una compra posterior',
      description: 'No pertenece a la orden anterior',
      price: 75,
      quantity: 5
    })
    const newCart = await Cart.create({
      user: order.user,
      items: [{ product: newProduct._id, quantity: 1 }],
      totalPrice: 75
    })
    const cartBeforeWebhook = newCart.toObject()
    mpState.status = 'approved'

    const response = await sendWebhook('payment-approved-1')
    const cartAfterWebhook = await Cart.findById(newCart._id)
    const orderAfterWebhook = await Order.findById(order._id)

    expect(response.status).toBe(201)
    expect(orderAfterWebhook.status).toBe('paid')
    expect(orderAfterWebhook.payment_id).toBe('payment-approved-1')
    expect((await Product.findById(product._id)).quantity).toBe(8)
    expect(vi.mocked(sendOrderEmail)).toHaveBeenCalledOnce()
    expect(cartAfterWebhook?.toObject()).toEqual(cartBeforeWebhook)
  })

  it('marks a rejected payment as failed and restores its reserved stock', async () => {
    const { order, product } = await createReservedOrder()

    const webhookResponse = await sendWebhook('payment-rejected-1')

    expect(webhookResponse.status).toBe(201)

    const orderAfterWebhook = await Order.findById(order._id)
    const productAfterWebhook = await Product.findById(product._id)

    expect(orderAfterWebhook.status).toBe('payment_failed')
    expect(orderAfterWebhook.payment_id).toBe('payment-rejected-1')
    expect(productAfterWebhook.quantity).toBe(10)
  })

  it('does not restore stock twice when the same rejected webhook is delivered again', async () => {
    const { order, product } = await createReservedOrder()

    const firstWebhookResponse = await sendWebhook('payment-rejected-duplicate')
    const duplicateWebhookResponse = await sendWebhook('payment-rejected-duplicate')

    expect(firstWebhookResponse.status).toBe(201)
    expect(duplicateWebhookResponse.status).toBe(201)

    const orderAfterDuplicateWebhook = await Order.findById(order._id)
    const productAfterDuplicateWebhook = await Product.findById(product._id)

    expect(orderAfterDuplicateWebhook.status).toBe('payment_failed')
    expect(productAfterDuplicateWebhook.quantity).toBe(10)
  })

  it('marks a cancelled payment as cancelled and restores its reserved stock once', async () => {
    mpState.status = 'cancelled'
    const { order, product } = await createReservedOrder()

    const firstWebhookResponse = await sendWebhook('payment-cancelled-1')
    const duplicateWebhookResponse = await sendWebhook('payment-cancelled-1')

    expect(firstWebhookResponse.status).toBe(201)
    expect(duplicateWebhookResponse.status).toBe(201)

    const orderAfterWebhook = await Order.findById(order._id)
    const productAfterDuplicateWebhook = await Product.findById(product._id)

    expect(orderAfterWebhook.status).toBe('cancelled')
    expect(productAfterDuplicateWebhook.quantity).toBe(10)
  })

  it('rejects a webhook with an invalid amount without changing order state or stock', async () => {
    const { order, product } = await createReservedOrder()
    mpState.transactionAmount = order.total + 1

    const webhookResponse = await sendWebhook('payment-invalid-amount')

    expect(webhookResponse.status).toBe(400)

    const orderAfterInvalidWebhook = await Order.findById(order._id)
    const productAfterInvalidWebhook = await Product.findById(product._id)

    expect(orderAfterInvalidWebhook.status).toBe('pending_payment')
    expect(orderAfterInvalidWebhook.payment_id).toBeUndefined()
    expect(productAfterInvalidWebhook.quantity).toBe(8)
  })

  it('finishes a rejected payment and restores stock only for products that still exist', async () => {
    const uniqueSuffix = `${Date.now()}-${Math.random()}`
    const user = await User.create({
      name: 'Atomicity',
      lastName: 'Tester',
      email: `mp-atomicity-${uniqueSuffix}@example.com`,
      password: 'password123',
      role: 'user'
    })
    const existingProduct = await Product.create({
      name: 'Producto que permanece disponible',
      description: 'Debe recuperar su reserva aunque otro producto se haya eliminado',
      price: 125,
      quantity: 10
    })
    const deletedProduct = await Product.create({
      name: 'Producto eliminado antes del webhook',
      description: 'Simula que un producto deja de existir antes de liberar stock',
      price: 75,
      quantity: 10
    })

    await Cart.create({
      user: user._id,
      items: [
        { product: existingProduct._id, quantity: 2 },
        { product: deletedProduct._id, quantity: 1 }
      ],
      totalPrice: 325
    })

    const createOrderResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${createToken(user)}`)
      .send({ shipping_info: shippingInfo, payment_method: 'mercadopago' })

    expect(createOrderResponse.status).toBe(201)

    const order = await Order.findById(createOrderResponse.body.data.newOrder.id)
    expect(order.status).toBe('pending_payment')
    expect((await Product.findById(existingProduct._id)).quantity).toBe(8)
    expect((await Product.findById(deletedProduct._id)).quantity).toBe(9)

    mpState.externalReference = order._id.toString()
    mpState.transactionAmount = order.total

    await Product.findByIdAndDelete(deletedProduct._id)

    await sendWebhook('payment-rejected-partial-release')

    const orderAfterRelease = await Order.findById(order._id)
    const existingProductAfterRelease = await Product.findById(existingProduct._id)

    expect(orderAfterRelease.status).toBe('payment_failed')
    expect(orderAfterRelease.payment_id).toBe('payment-rejected-partial-release')
    expect(existingProductAfterRelease.quantity).toBe(10)
  })
})
