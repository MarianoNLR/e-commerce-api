import { describe, it, expect } from "vitest";
import { subject } from "@casl/ability";
import { defineAbilitiesFor } from "../../casl/abilities.js";

describe("CASL Abilities", () => {
    it("should allow admin to manage all", () => {
        const ability = defineAbilitiesFor({ role: 'admin'});

        expect(ability.can('manage', 'all')).toBe(true);
    });

    it("should allow moderator to manage products and categories but not users", () => {
        const ability = defineAbilitiesFor({ role: 'moderator'});

        expect(ability.can('manage', 'Product')).toBe(true);
        expect(ability.can('manage', 'Category')).toBe(true);
        expect(ability.can('update', 'User')).toBe(false);
        expect(ability.can('delete', 'User')).toBe(false);
    });

    it("should allow regular user to read products but not update them", () => {
        const ability = defineAbilitiesFor({ role: 'user'});
        
        expect(ability.can('read', 'Product')).toBe(true);
        expect(ability.can('update', 'Product')).toBe(false);
    });

    it("should allow regular user to read his own orders", () => {
        const user = { role: 'user', id: 'user123' };
        const order = subject('Order', { user: 'user123' });

        const ability = defineAbilitiesFor(user);

        expect(ability.can('read', order)).toBe(true);
    });

    it("should not allow regular user to read others' orders", () => {
        const user = { role: 'user', id: 'user123' };
        const order = subject('Order', { user: 'user456' });

        const ability = defineAbilitiesFor(user);
        expect(ability.can('read', order)).toBe(false);
    });
})