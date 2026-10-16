import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import jwt from 'jsonwebtoken'

const uploadToCloudinaryMock = vi.hoisted(() =>
  vi.fn(async () => ({ secure_url: 'https://cloudinary.test/payment-proof.png' }))
)

vi.mock('../utils/uploadToCloudinary.js', () => ({
  uploadToCloudinary: uploadToCloudinaryMock
}))

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
  zip: '1000'
}

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  await mongoose.connect(mongoServer.getUri())
})

afterEach(async () => {
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

async function createTransferFixture () {
  const suffix = `${Date.now()}-${Math.random()}`
  const customer = await User.create({
    name: 'Transfer',
    lastName: 'Customer',
    email: `transfer-${suffix}@example.com`,
    password: 'password123',
    role: 'user'
  })
  const admin = await User.create({
    name: 'Transfer',
    lastName: 'Admin',
    email: `transfer-admin-${suffix}@example.com`,
    password: 'password123',
    role: 'admin'
  })
  const product = await Product.create({
    name: `Producto transferencia ${suffix}`,
    description: 'Producto para validar comprobantes',
    price: 125,
    quantity: 10
  })
  await Cart.create({
    user: customer._id,
    items: [{ product: product._id, quantity: 2 }],
    totalPrice: 250
  })

  const orderResponse = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${createToken(customer)}`)
    .send({ shipping_info: shippingInfo, payment_method: 'bank_transfer' })

  return {
    customer,
    admin,
    product,
    orderId: orderResponse.body.data.newOrder.id,
    customerToken: createToken(customer),
    adminToken: createToken(admin)
  }
}

async function uploadProof (orderId, token) {
  return await request(app)
    .post(`/api/v1/orders/${orderId}/payment_proof`)
    .set('Authorization', `Bearer ${token}`)
    .attach('image', Buffer.from('fake-png-content'), {
      filename: 'proof.png',
      contentType: 'image/png'
    })
}

describe('Bank transfer review lifecycle', () => {
  it('allows an administrator to approve a submitted transfer without releasing reserved stock', async () => {
    const { product, orderId, customerToken, adminToken } = await createTransferFixture()

    const proofResponse = await uploadProof(orderId, customerToken)
    const approvalResponse = await request(app)
      .put(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'paid' })

    const orderAfterApproval = await Order.findById(orderId)
    const productAfterApproval = await Product.findById(product._id)

    expect(proofResponse.status).toBe(200)
    expect(approvalResponse.status).toBe(200)
    expect(orderAfterApproval.status).toBe('paid')
    expect(productAfterApproval.quantity).toBe(8)
  })

  it('lets an administrator reject a submitted transfer and releases its reservation only once', async () => {
    const { product, orderId, customerToken, adminToken } = await createTransferFixture()

    await uploadProof(orderId, customerToken)
    const firstRejection = await request(app)
      .put(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'payment_rejected' })
    const secondRejection = await request(app)
      .put(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'payment_rejected' })

    const orderAfterRejection = await Order.findById(orderId)
    const productAfterRejection = await Product.findById(product._id)

    expect(firstRejection.status).toBe(200)
    expect(secondRejection.status).toBe(400)
    expect(orderAfterRejection.status).toBe('payment_rejected')
    expect(productAfterRejection.quantity).toBe(10)
  })

  it('does not let a submitted transfer be cancelled or expired automatically', async () => {
    const { product, orderId, customerToken } = await createTransferFixture()

    await uploadProof(orderId, customerToken)
    await Order.findByIdAndUpdate(orderId, {
      expires_at: new Date(Date.now() - 60_000)
    })

    const cancellationResponse = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
    await expirePendingOrders()

    const orderAfterAttempts = await Order.findById(orderId)
    const productAfterAttempts = await Product.findById(product._id)

    expect(cancellationResponse.status).toBe(404)
    expect(orderAfterAttempts.status).toBe('pending_validation')
    expect(productAfterAttempts.quantity).toBe(8)
  })
})
