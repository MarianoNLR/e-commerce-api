import Category from "../models/Category.js";

export async function getAll() {
    const categories = await Category.find({});
    return categories;
}

export async function addCategory({ name }) {
    if (!name || name.length < 2) {
        throw { status: 400, message: 'Name of category must have more than 2 letters.' };
    }
    
    const newCategory = new Category({ name });
    const result = await newCategory.save();
    return result;
}