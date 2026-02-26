import { describe, it, beforeAll, afterAll, expect, vi } from "vitest";
import request  from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import app from "../index.js";
import Order from "../models/Order.js";
import jwt from "jsonwebtoken";
import { connectDB, disconnectDB } from "../mongo.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";

let mongoServer;
let user;
let products = [];
let cart;
let token;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);

    // Create a test user, product, and cart
    user = await User.create({
        name: "testuser",
        lastName: "user",
        email: "testuser@example.com",
        password: "password123",
        role: "user"
    });
    console.log(user)
    products.push(await Product.create({
        name: "Test Product",
        description: "A product for testing",
        price: 100
    }));
    products.push(await Product.create({
        name: "Another Test Product",
        description: "Another product for testing",
        price: 150
    }));
    console.log('PRODUCTS CREATED IN BEFOREALL: ', products)
    cart = await Cart.create({
        user: user._id,
        items: [
            {product: products[0]._id, quantity: 2},
            {product: products[1]._id, quantity: 1}
        ],
        totalPrice: 350
    });
    console.log('CART CREATED IN BEFOREALL: ', cart)
    token = generateToken({ userId: user._id, role: "user" });
});

afterAll(async () => {
    await disconnectDB();
    await mongoServer.stop();
});

function generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET || "testsecret", { expiresIn: "1h" });
}

describe("Orders API Integration Tests", () => {
    it("should allow user to read his own orders", async () => {
        const res = await request(app)
            .get('/orders/')
            .set("Authorization", `Bearer ${token}`)
        
        expect(res.status).toBe(200);
    });

    it("should allow user to create an order", async () => {

        const res = await request(app)
            .post('/orders')
            .set("authorization", `Bearer ${token}`)
            .send({
                shipping_info: {
                    name: "John",
                    lastName: "Doe",
                    email: "john.doe@example.com",
                    phone: "1234567890",
                    address: "123 Main St",
                    city: "Anytown",
                    state: "Anystate",
                    zip: "12345",
                    observations: "Leave at front door"
                }
            });
        expect(res.status).toBe(201);
        expect(res.body.newOrder).toBeDefined();
        expect(res.body.newOrder.items.length).toBe(2);
        expect(res.body.newOrder.total).toBe(350);

        const orderInDb = await Order.findById(res.body.newOrder.id);
        expect(orderInDb).not.toBeNull();
        expect(orderInDb.user.toString()).toBe(user._id.toString());

        const cartInDb = await Cart.findOne({ user: user._id });
        expect(cartInDb).toBeNull();
    })
});