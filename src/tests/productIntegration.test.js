import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
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

import app from '../index.js'
import Product from '../models/Product.js'
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

describe('Product Service Integration', () => {
  it('create product in DB', async () => {
    const category = await categoryService.addCategory({ name: 'Mouse' })

    const res = await request(app)
      .post('/api/v1/products')
      .field('name', 'Logitech MX Master 3')
      .field('price', 99.99)
      .field('quantity', 50)
      .field('categoryId', category._id.toString())
      .field('description', 'Advanced wireless mouse')
      .attach('images', TINY_PNG, { filename: 'mouse.png', contentType: 'image/png' })

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
}, 20000)
