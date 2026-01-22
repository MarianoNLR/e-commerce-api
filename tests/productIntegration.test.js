import { describe, expect, it, beforeAll, afterAll } from "vitest";
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
        const data = {
            name: "Logitech MX Master 3",
            price: 99.99,
            quantity: 50,
            categoryId: category._id,
            description: "Advanced wireless mouse",
            images: []
        };
        const product = await productService.add(data);

        expect(product._id).toBeDefined();
        expect(product.name).toBe("Logitech MX Master 3");
        expect(product.price).toBe(99.99);
        expect(product.quantity).toBe(50);
        expect(product.categoryId.toString()).toBe(category._id.toString());
        expect(product.description).toBe("Advanced wireless mouse");

        const foundProduct = await productService.getById({ productId: product._id });
        expect(foundProduct).not.toBeNull();
        expect(foundProduct.name).toBe("Logitech MX Master 3");

        });

    }, 20000);