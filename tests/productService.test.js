import { describe, expect, it, vi } from "vitest";
import { subject } from "@casl/ability";

vi.mock("../models/Product.js", () => ({
    default: {
        find: vi.fn(),
        findById: vi.fn(),
    }
}));

import * as productService from "../services/productService.js";



describe("Product Service", () => {
    it("should validate product ID in getById", async () => {
        await expect(productService.getById({ productId: "invalid-id" }))
            .rejects
            .toMatchObject({ status: 400, message: 'Valid product ID is required' });
    });

    it("should throw error if query is too long in getBySearch", async () => {
        const longQuery = 'a'.repeat(101);
        await expect(productService.getBySearch({ q: longQuery }))
            .rejects
            .toMatchObject({ status: 400, message: 'Search query too long' });
    });
});