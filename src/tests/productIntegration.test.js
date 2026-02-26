import { describe, expect, it, beforeAll, afterAll } from "vitest";
import request  from "supertest";
import app from "../index.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import * as productService from "../services/productService.js";
import * as categoryService from "../services/categoryService.js";

let mongoServer;


// DB Connection setup 
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

// DB disconnection
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe("Product Service Integration", () => {
    it("create product in DB", async () => {
        // Test logic to create a product in the database
        const category = await categoryService.addCategory({ name: "Mouse" });
        const res = await request(app)
        .post("/api/v1/products")
        .field("name", "Logitech MX Master 3")
        .field("price", 99.99)
        .field("quantity", 50)
        .field("categoryId", category._id.toString())
        .field("description", "Advanced wireless mouse")
        .attach("images", "C:\\Users\\Mariano\\OneDrive\\Imágenes\\Screenshots\\2024-11-14 23_41_10-Window.png")
        // const product = await productService.add(data);

        // expect(product._id).toBeDefined();
        // expect(product.name).toBe("Logitech MX Master 3");
        // expect(product.price).toBe(99.99);
        // expect(product.quantity).toBe(50);
        // expect(product.categoryId.toString()).toBe(category._id.toString());
        // expect(product.description).toBe("Advanced wireless mouse");
        console.log('RESPONSE BODY: ', res.body)

        // const foundProduct = await productService.getById({ productId: product._id });
        // expect(foundProduct).not.toBeNull();
        // expect(foundProduct.name).toBe("Logitech MX Master 3");

        });

    }, 20000);