import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import jwt from 'jsonwebtoken'

const preferenceCreateMock = vi.hoisted(() =>
  vi.fn(async () => ({
    id: 'pref_payment_method_test',
    init_point: 'https://sandbox.mercadopago.test/preferences/pref_payment_method_test'
  }))
)

const uploadToCloudinaryMock = vi.hoisted(() =>
  vi.fn(async () => ({ secure_url: 'https://cloudinary.test/payment-proof.png' }))
)

vi.mock('mercadopago', () => ({
  MercadoPagoConfig: class MercadoPagoConfig {},
  Preference: class Preference {
    async create (payload) {
      return await preferenceCreateMock(payload)
    }
  },
  Payment: class Payment {}
}))

vi.mock('../utils/uploadToCloudinary.js', () => ({
  uploadToCloudinary: uploadToCloudinaryMock
}))

import app from '../index.js'
import Cart from '../models/Cart.js'
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
  preferenceCreateMock.mockClear()
  uploadToCloudinaryMock.mockClear()
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

async function createCheckoutFixture () {
  const suffix = `${Date.now()}-${Math.random()}`
  const user = await User.create({
    name: 'Payment',
    lastName: 'Tester',
    email: `payment-${suffix}@example.com`,
    password: 'password123',
    role: 'user'
  })
  const product = await Product.create({
    name: `Producto de pago ${suffix}`,
    description: 'Producto para validar medios de pago',
    price: 125,
    quantity: 10
  })
  const cart = await Cart.create({
    user: user._id,
    items: [{ product: product._id, quantity: 2 }],
    totalPrice: 250
  })

  return { user, product, cart, token: createToken(user) }
}

async function createOrderThroughApi (token, paymentMethod) {
  const body = { shipping_info: shippingInfo }
  if (paymentMethod !== undefined) body.payment_method = paymentMethod

  return await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send(body)
}

describe('Payment method persistence and validation', () => {
  it.each(['mercadopago', 'bank_transfer'])('persists %s when creating an order', async (paymentMethod) => {
    const { token } = await createCheckoutFixture()

    const response = await createOrderThroughApi(token, paymentMethod)
    const order = await Order.findById(response.body.data?.newOrder?.id)

    expect(response.status).toBe(201)
    expect(order.payment_method).toBe(paymentMethod)
  })

  it.each([undefined, 'cash'])('rejects an order with payment method %s without changing stock or cart', async (paymentMethod) => {
    const { user, product, cart, token } = await createCheckoutFixture()

    const response = await createOrderThroughApi(token, paymentMethod)

    const productAfterAttempt = await Product.findById(product._id)
    const cartAfterAttempt = await Cart.findById(cart._id)
    const ordersAfterAttempt = await Order.find({ user: user._id })

    expect(response.status).toBe(400)
    expect(productAfterAttempt.quantity).toBe(10)
    expect(cartAfterAttempt).not.toBeNull()
    expect(ordersAfterAttempt).toHaveLength(0)
  })

  it('stores the Mercado Pago preference ID on the existing Mercado Pago order', async () => {
    const { token } = await createCheckoutFixture()
    const orderResponse = await createOrderThroughApi(token, 'mercadopago')
    const orderId = orderResponse.body.data.newOrder.id

    const paymentResponse = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_id: orderId, payment_method: 'mercadopago' })

    const orderAfterPreference = await Order.findById(orderId)

    expect(paymentResponse.status).toBe(200)
    expect(paymentResponse.body.data.result.id).toBe('pref_payment_method_test')
    expect(orderAfterPreference.payment_method).toBe('mercadopago')
    expect(orderAfterPreference.payment_preference_id).toBe('pref_payment_method_test')
  })

  it('sets the Mercado Pago preference expiration to the order expiration', async () => {
    const { token } = await createCheckoutFixture()
    const orderResponse = await createOrderThroughApi(token, 'mercadopago')
    const orderId = orderResponse.body.data.newOrder.id
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await Order.findByIdAndUpdate(orderId, { expires_at: expiresAt })

    const response = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_id: orderId, payment_method: 'mercadopago' })

    expect(response.status).toBe(200)
    expect(preferenceCreateMock).toHaveBeenCalledOnce()
    expect(new Date(preferenceCreateMock.mock.calls[0][0].body.expiration_date_to).getTime()).toBe(expiresAt.getTime())
  })

  it('reuses an existing preference while the order is still valid', async () => {
    const { token } = await createCheckoutFixture()
    const orderResponse = await createOrderThroughApi(token, 'mercadopago')
    const orderId = orderResponse.body.data.newOrder.id
    await Order.findByIdAndUpdate(orderId, { payment_preference_id: 'existing-preference' })

    const response = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_id: orderId, payment_method: 'mercadopago' })

    expect(response.status).toBe(200)
    expect(response.body.data.result.id).toBe('existing-preference')
    expect(preferenceCreateMock).not.toHaveBeenCalled()
  })

  it.each([
    ['bank_transfer', false],
    ['mercadopago', false],
    ['mercadopago', true]
  ])('rejects starting %s payment after expiration (existing preference: %s)', async (paymentMethod, hasPreference) => {
    const { token, product } = await createCheckoutFixture()
    const orderResponse = await createOrderThroughApi(token, paymentMethod)
    const orderId = orderResponse.body.data.newOrder.id
    await Order.findByIdAndUpdate(orderId, {
      expires_at: new Date(Date.now() - 60_000),
      ...(hasPreference ? { payment_preference_id: 'existing-preference' } : {})
    })

    const response = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_id: orderId, payment_method: paymentMethod })

    const order = await Order.findById(orderId)
    expect(response.status).toBe(400)
    expect(order.status).toBe('pending_payment')
    expect(order.payment_preference_id).toBe(hasPreference ? 'existing-preference' : undefined)
    expect((await Product.findById(product._id)).quantity).toBe(8)
    expect(preferenceCreateMock).not.toHaveBeenCalled()
  })

  it('rejects a Mercado Pago preference request for a bank-transfer order', async () => {
    const { token } = await createCheckoutFixture()
    const orderResponse = await createOrderThroughApi(token, 'bank_transfer')
    const orderId = orderResponse.body.data.newOrder.id

    const paymentResponse = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_id: orderId, payment_method: 'mercadopago' })

    expect(paymentResponse.status).toBe(400)
    expect(preferenceCreateMock).not.toHaveBeenCalled()
  })

  it('uses the existing bank-transfer order instead of creating a second order', async () => {
    const { user, product, token } = await createCheckoutFixture()
    const orderResponse = await createOrderThroughApi(token, 'bank_transfer')
    const orderId = orderResponse.body.data.newOrder.id

    const paymentResponse = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_id: orderId, payment_method: 'bank_transfer' })

    const ordersAfterCheckout = await Order.find({ user: user._id })
    const productAfterCheckout = await Product.findById(product._id)

    expect(paymentResponse.status).toBe(200)
    expect(ordersAfterCheckout).toHaveLength(1)
    expect(ordersAfterCheckout[0]._id.toString()).toBe(orderId)
    expect(productAfterCheckout.quantity).toBe(8)
  })

  it('rejects a transfer proof for a Mercado Pago order without uploading it', async () => {
    const { token } = await createCheckoutFixture()
    const orderResponse = await createOrderThroughApi(token, 'mercadopago')
    const orderId = orderResponse.body.data.newOrder.id

    const proofResponse = await request(app)
      .post(`/api/v1/orders/${orderId}/payment_proof`)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('fake-png-content'), {
        filename: 'proof.png',
        contentType: 'image/png'
      })

    const orderAfterAttempt = await Order.findById(orderId)

    expect(proofResponse.status).toBe(400)
    expect(orderAfterAttempt.status).toBe('pending_payment')
    expect(orderAfterAttempt.proof_of_payment_url).toBeUndefined()
    expect(uploadToCloudinaryMock).not.toHaveBeenCalled()
  })
})
