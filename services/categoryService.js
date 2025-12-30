import mongoose from "mongoose";
import Category from "../models/Category.js";
import { BadRequestError } from "../errors/BadRequestError.js";
import { NotFoundError } from "../errors/NotFoundError.js";

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

export async function getAll() {
    const categories = await Category.find({});
    return categories;
}

export async function getAllWithCount() {
    const categories = await Category.aggregate([
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: 'categoryId',
                as: 'products'
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                productCount: { $size: '$products' }
            }
        }
    ])

    return categories;
}

export async function addCategory({ name }) {
    if (!name || name.length < 2) {
        throw new BadRequestError('Name of category must have more than 2 letters.');
    }
    try {
        const newCategory = new Category({ name });
        const result = await newCategory.save();
    } catch (error) {
        if (error.code === 11000) {
            throw new BadRequestError('Category name already exists.');
        }
        throw error;
    }
    
    
    return result;
}

export async function deleteCategory(categoryId) {
    if (!categoryId || !isValidObjectId(categoryId)) {
        throw new BadRequestError('Category ID is required.');
    }
    const result = await Category.findByIdAndDelete(categoryId);

    if (!result) {
        throw new NotFoundError('Category not found.');
    }
    return result;
}

export async function updateCategory(categoryId, { name }) {
    if (!categoryId || !isValidObjectId(categoryId)) {
        throw new BadRequestError('Category ID is required.');
    }
    
    if (!name || name.length < 2) {
        throw new BadRequestError('Name of category must have more than 2 letters.');
    }

    try {
        const result = await Category.findByIdAndUpdate(categoryId, { name }, { new: true });
        if (!result) {
            throw new NotFoundError('Category not found.');
        }

        return result;
        
    } catch (error) {
        if (error.code === 11000) {
            throw new BadRequestError('Category name already exists.');
        }
        throw error;
    } 
}

export async function getCategoryById({categoryId}) {
    if (!categoryId || !isValidObjectId(categoryId)) {
        throw new BadRequestError('Category ID is required.');
    }
    const result = await Category.findById(categoryId);
    if (!result) {
        throw new NotFoundError('Category not found.');
    }
    return result;
}

export async function getCategoryWithCount({categoryId}) {
    if (!categoryId || !isValidObjectId(categoryId)) {
        throw new BadRequestError('Category ID is required.');
    }

    const result = await Category.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(categoryId) } },
        {
        $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'categoryId',
            as: 'products'
        }
        },
        {
        $project: {
            _id: 1,
            name: 1,
            parent_id: 1,
            productCount: { $size: '$products' }
        }
        }
    ]);

    return result[0] || null ;
}