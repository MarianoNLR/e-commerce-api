import { describe, test, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'
import bcrypt from 'bcrypt'
import app from '../index.js'
import Session from '../models/Session.js'
import User from '../models/User.js'

let mongoServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())

  await User.create({
    name:     'Test',
    lastName: 'User',
    email:    'test@test.com',
    password: await bcrypt.hash('123456', 10),
    role:     'user'
  })
}, 20000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
}, 20000)

describe('Login', () => {
  test('simultaneous logins of the same user create independent sessions', async () => {
    await Session.deleteMany({})

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'test@test.com', password: '123456' })
      )
    )

    expect(responses.map(res => res.status)).toEqual([200, 200, 200, 200, 200])
    expect(await Session.countDocuments()).toBe(5)
  }, 20000)

  test('sets a cross-site refresh token cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: '123456' })

    const cookie = res.headers['set-cookie'][0]
    expect(cookie).toMatch(/^refreshToken=/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/Secure/)
    expect(cookie).toMatch(/SameSite=None/)
  }, 20000)
})

describe('Logout', () => {
  test('succeeds without a refresh token cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout')
    expect(res.status).toBe(200)
  })
})

describe('Refresh Token', () => {
  let cookie

  beforeEach(async () => {
    await Session.deleteMany({})

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: '123456' })

    const rawCookie = res.headers['set-cookie']?.[0]
    cookie = rawCookie?.split(';')[0]
  }, 20000)

  test('normal flow - return a new access token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('accessToken')
    expect(res.headers['set-cookie']).toBeDefined()
  })

  test('reuse detection — revoke all sessions', async () => {
    const originalCookie = cookie

    // rotate token to get a new refresh token and invalidate the original one
    await request(app)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', cookie)
    const rotatedSession = await Session.findOne({ revokedReason: 'refresh' })
    await Session.findByIdAndUpdate(rotatedSession._id, { revokedAt: new Date(Date.now() - 6000) })

    // A token reused after the five-second rotation grace period revokes all active sessions.
    const res = await request(app)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', originalCookie)

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('REFRESH_TOKEN_REUSE')

    const activeSessions = await Session.countDocuments({ revokedAt: null })
    expect(activeSessions).toBe(0)
  })

  test('token does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', 'refreshToken=tokeninventado')

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN')
  })

  test('race condition — two simultaneous requests', async () => {
    const [r1, r2] = await Promise.all([
      request(app).post('/api/v1/auth/refresh-token').set('Cookie', cookie),
      request(app).post('/api/v1/auth/refresh-token').set('Cookie', cookie)
    ])

    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 401])

    const winner = r1.status === 200 ? r1 : r2
    const loser  = r1.status === 401 ? r1 : r2

    expect(winner.body.data).toHaveProperty('accessToken')
    expect(loser.body.error.code).toBe('REFRESH_TOKEN_ALREADY_ROTATED')
  })

  test('logout — token deleted', async () => {
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)

    const res = await request(app)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', cookie)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('REFRESH_TOKEN_NOT_FOUND')
  })
})
