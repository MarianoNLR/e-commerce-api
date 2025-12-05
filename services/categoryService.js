import mongoose from "mongoose";
import Category from "../models/Category.js";

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
        throw { status: 400, message: 'Name of category must have more than 2 letters.' };
    }
    
    const newCategory = new Category({ name });
    const result = await newCategory.save();
    
    return result;
}

export async function deleteCategory(categoryId) {
    if (!categoryId) {
        throw { status: 400, message: 'Category ID is required.' };
    }
    const result = await Category.findByIdAndDelete(categoryId);

    if (!result) {
        throw { status: 404, message: 'Category not found.' };
    }
    return result;
}

export async function updateCategory(categoryId, { name }) {
    if (!categoryId) {
        throw { status: 400, message: 'Category ID is required.' };
    }
    
    if (!name || name.length < 2) {
        throw { status: 400, message: 'Name of category must have more than 2 letters.' };
    }

    const result = await Category.findByIdAndUpdate(categoryId, { name }, { new: true });

    if (!result) {
        throw { status: 404, message: 'Category not found.' };
    }

    
    return result;
}

export async function getCategoryById({categoryId}) {
    if (!categoryId) {
        throw { status: 400, message: 'Category ID is required.' };
    }
    return await Category.findById(categoryId);
}

export async function getCategoryWithCount({categoryId}) {
    if (!categoryId) {
        throw { status: 400, message: 'Category ID is required.' };
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

    return result[0] || null;
}