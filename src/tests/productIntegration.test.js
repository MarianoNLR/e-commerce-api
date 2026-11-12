import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { MongoMemoryServer } from 'mongodb-memory-server'

// Cloudinary se mockea: el test valida el flujo de guardado sin subir nada a internet
const uploadToCloudinaryMock = vi.hoisted(() =>
  vi.fn(async () => ({
    public_id: 'products/test-image',
    secure_url: 'https://cloudinary.test/products/test-image.png'
  }))
)

vi.mock('../utils/uploadToCloudinary.js', () => ({
  uploadToCloudinary: uploadToCloudinaryMock
}))

// El borrado de imágenes usa cloudinary.uploader.destroy desde config/cloudinary.js
const cloudinaryDestroyMock = vi.hoisted(() => vi.fn(async () => ({ result: 'ok' })))

vi.mock('../config/cloudinary.js', () => ({
  default: { uploader: { destroy: cloudinaryDestroyMock } }
}))

import app from '../index.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import * as categoryService from '../services/categoryService.js'

// PNG válido de 1x1 píxel, generado en memoria (no depende de archivos del disco)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64'
)

let mongoServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  uploadToCloudinaryMock.mockClear()
  cloudinaryDestroyMock.mockClear()
  await Product.deleteMany({})
})

function createToken (user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || 'testsecret',
    { expiresIn: '1h' }
  )
}

async function createUser (role) {
  const suffix = `${role}-${Date.now()}-${Math.random()}`

  return await User.create({
    name: role,
    lastName: 'Tester',
    email: `${suffix}@example.com`,
    password: 'password123',
    role
  })
}

function postProduct ({ token, fields = {}, withImage = true } = {}) {
  const req = request(app).post('/api/v1/products')
  if (token) req.set('Authorization', `Bearer ${token}`)

  for (const [key, value] of Object.entries(fields)) {
    req.field(key, value)
  }
  if (withImage) {
    req.attach('images', TINY_PNG, { filename: 'mouse.png', contentType: 'image/png' })
  }
  return req
}

describe('Product Service Integration', () => {
  it('create product in DB (admin)', async () => {
    const category = await categoryService.addCategory({ name: 'Mouse' })
    const admin = await createUser('admin')

    const res = await postProduct({
      token: createToken(admin),
      fields: {
        name: 'Logitech MX Master 3',
        price: 99.99,
        quantity: 50,
        categoryId: category._id.toString(),
        description: 'Advanced wireless mouse'
      }
    })

    expect(res.status).toBe(201)
    expect(uploadToCloudinaryMock).toHaveBeenCalledTimes(1)

    const product = await Product.findOne({ name: 'Logitech MX Master 3' })
    expect(product).not.toBeNull()
    expect(product.price).toBe(99.99)
    expect(product.quantity).toBe(50)
    expect(product.categoryId.toString()).toBe(category._id.toString())
    expect(product.description).toBe('Advanced wireless mouse')
    expect(product.images).toHaveLength(1)
    expect(product.images[0].secure_url).toBe('https://cloudinary.test/products/test-image.png')
  })

  it('rejects product creation without credentials (401)', async () => {
    const category = await categoryService.addCategory({ name: 'Teclado' })

    const res = await postProduct({
      fields: {
        name: 'Teclado sin login',
        price: 10,
        quantity: 1,
        categoryId: category._id.toString()
      }
    })

    expect(res.status).toBe(401)
    expect(uploadToCloudinaryMock).not.toHaveBeenCalled()
    expect(await Product.countDocuments()).toBe(0)
  })

  it('rejects product creation for a regular user (403)', async () => {
    const category = await categoryService.addCategory({ name: 'Monitor' })
    const user = await createUser('user')

    const res = await postProduct({
      token: createToken(user),
      fields: {
        name: 'Monitor de usuario común',
        price: 10,
        quantity: 1,
        categoryId: category._id.toString()
      }
    })

    expect(res.status).toBe(403)
    expect(uploadToCloudinaryMock).not.toHaveBeenCalled()
    expect(await Product.countDocuments()).toBe(0)
  })

  it('rejects an invalid body with a validation error (400)', async () => {
    const admin = await createUser('admin')

    const res = await postProduct({
      token: createToken(admin),
      fields: {
        name: 'Producto inválido',
        price: -5,
        quantity: 1.5,
        categoryId: 'not-a-valid-id'
      }
    })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(uploadToCloudinaryMock).not.toHaveBeenCalled()
    expect(await Product.countDocuments()).toBe(0)
  })
}, 20000)

describe('Product update (PUT /products/:id)', () => {
  async function createProduct () {
    const category = await categoryService.addCategory({ name: `Cat ${Date.now()}-${Math.random()}` })

    return await Product.create({
      name: 'Producto original',
      price: 100,
      quantity: 10,
      description: 'Descripción original',
      categoryId: category._id,
      images: [
        { public_id: 'products/old-1', secure_url: 'https://cloudinary.test/products/old-1.png' },
        { public_id: 'products/old-2', secure_url: 'https://cloudinary.test/products/old-2.png' }
      ]
    })
  }

  // La UI manda multipart/form-data (FormData), así que el test hace lo mismo
  function putProduct (id, { token, fields = {} } = {}) {
    const req = request(app).put(`/api/v1/products/${id}`)
    if (token) req.set('Authorization', `Bearer ${token}`)

    for (const [key, value] of Object.entries(fields)) {
      req.field(key, value)
    }
    return req
  }

  const validFields = {
    name: 'Producto actualizado',
    price: 150,
    quantity: 7,
    description: 'Descripción actualizada'
  }

  it('rejects update without credentials (401)', async () => {
    const product = await createProduct()

    const res = await putProduct(product._id, { fields: validFields })

    expect(res.status).toBe(401)
    const unchanged = await Product.findById(product._id)
    expect(unchanged.name).toBe('Producto original')
  })

  it('rejects update for a regular user (403)', async () => {
    const product = await createProduct()
    const user = await createUser('user')

    const res = await putProduct(product._id, { token: createToken(user), fields: validFields })

    expect(res.status).toBe(403)
    const unchanged = await Product.findById(product._id)
    expect(unchanged.name).toBe('Producto original')
  })

  it('rejects an invalid body with a validation error (400)', async () => {
    const product = await createProduct()
    const admin = await createUser('admin')

    const res = await putProduct(product._id, {
      token: createToken(admin),
      fields: { ...validFields, price: -5, quantity: 1.5 }
    })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    const unchanged = await Product.findById(product._id)
    expect(unchanged.price).toBe(100)
    expect(unchanged.quantity).toBe(10)
  })

  it('updates the product fields as admin', async () => {
    const product = await createProduct()
    const admin = await createUser('admin')

    const res = await putProduct(product._id, { token: createToken(admin), fields: validFields })

    expect(res.status).toBe(200)
    const updated = await Product.findById(product._id)
    expect(updated.name).toBe('Producto actualizado')
    expect(updated.price).toBe(150)
    expect(updated.quantity).toBe(7)
    expect(updated.description).toBe('Descripción actualizada')
    expect(updated.images).toHaveLength(2)
  })

  it('keeps the fields that are not sent (partial update)', async () => {
    const product = await createProduct()
    const admin = await createUser('admin')

    const res = await putProduct(product._id, { token: createToken(admin), fields: { price: 150 } })

    expect(res.status).toBe(200)
    const updated = await Product.findById(product._id)
    expect(updated.price).toBe(150)
    expect(updated.name).toBe('Producto original')
    expect(updated.quantity).toBe(10)
    expect(updated.description).toBe('Descripción original')
  })

  it('rejects imagesToDelete that is not a JSON array (400)', async () => {
    const product = await createProduct()
    const admin = await createUser('admin')

    const res = await putProduct(product._id, {
      token: createToken(admin),
      fields: { ...validFields, imagesToDelete: 'not-json' }
    })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(cloudinaryDestroyMock).not.toHaveBeenCalled()
  })

  it('removes the images listed in imagesToDelete (JSON string, like the UI sends)', async () => {
    const product = await createProduct()
    const admin = await createUser('admin')

    const res = await putProduct(product._id, {
      token: createToken(admin),
      fields: { ...validFields, imagesToDelete: JSON.stringify(['products/old-1']) }
    })

    expect(res.status).toBe(200)
    const updated = await Product.findById(product._id)
    expect(updated.images.map(img => img.public_id)).toEqual(['products/old-2'])
    expect(cloudinaryDestroyMock).toHaveBeenCalledTimes(1)
    expect(cloudinaryDestroyMock).toHaveBeenCalledWith('products/old-1')
  })
}, 20000)
