import Product from "../models/Product.js"
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import mongoose from "mongoose";
import path, { extname } from "path";
import { unlink } from "fs/promises";
import 'dotenv/config'
import cloudinary from "../config/cloudinary.js";
import { AppError } from "../errors/AppError.js";

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

export async function getAll({categoryId, filters = {}}) {
    if (categoryId) {
        if (!isValidObjectId(categoryId)) {
            const err = new Error('Valid category ID is required')
            err.status = 400
            throw err
        }
        filters.categoryId = categoryId
    }

    const products = await Product.find(filters).collation({ locale: 'es', strength: 2 }).sort({ price: -1 })
        .populate('categoryId')
    
    if (!products) {
        const err = new Error('No products found')
        err.status = 404
        throw err
    }
    return products
}

export async function getBySearch({q, filters = {}}) {
    // query validation
    const query = q ? q.trim() : ''
    if (query.length > 100) {
        const err = new Error('Search query too long')
        err.status = 400
        throw err
    }
      
    filters.name = { $regex: query, $options: 'i' }

    const products = await Product.find(filters)
        .populate('categoryId')
    
    if (!products) {
        const err = new Error('No products found')
        err.status = 404
        throw err
    }
    return products
}

export async function getById({ productId }) {  
    if (!productId || !isValidObjectId(productId)) {
        const err = new Error('Valid product ID is required')
        err.status = 400
        throw err
    }
    const product = await Product.findById(productId)

    if (!product) {
        const err = new Error('Product not found')
        err.status = 404
        throw err
    }
    return product
}

export async function add({ name, price, quantity, categoryId, description, images }) {
    const imagesArray = []
    const imagesUploads = images.map(image => uploadToCloudinary(image.buffer, 'products'))
    const imagesResults = await Promise.all(imagesUploads)
    imagesResults.forEach(result => imagesArray.push({ public_id: result.public_id, secure_url: result.secure_url }))
    // images.filter().forEach(image => {
    // const fileExtension = extname(image.originalname)
    // const fileName = image.filename.split(fileExtension)[0]
    // const fileFullName = `${fileName}${fileExtension}`
    // imagesURLs.push(fileFullName)
    // });

    const newProduct = new Product({
        name,
        price,
        quantity,
        categoryId,
        description,
        images: imagesArray
    })
    console.log('NEW PRODUCT SERVICE: ', newProduct)
    const result = await newProduct.save()
    return result
}

export async function update({ productId, productsUpdate, newImages, imagesToDelete }) {
    if (!productId || !isValidObjectId(productId)) {
        const err = new Error('Valid product ID is required')
        err.status = 400
        throw err
    }


    // Get product
    const product = await Product.findById(productId)
    if (!product) {
        const err = new Error('Product not found')
        err.status = 404
        throw err
    }

    // Update product simple fields first before handling images
    updateSimpleFields(product, productsUpdate)

    // handle images update
    let failedUploads = []
    let uploadedImages = []
    if (newImages.length > 0 || imagesToDelete.length > 0) {
        const result = await updateProductImages(product, newImages, imagesToDelete)
        failedUploads = result.failedUploads
        uploadedImages = result.uploadedImages
    }

    await product.save()
    await deleteImagesFromCloudinary(imagesToDelete)
    return {
        product, 
        failedUploads: failedUploads.length > 0 ? failedUploads : undefined 
    }
}

async function updateSimpleFields(product, productsUpdate) {
    Object.assign(product, productsUpdate)
}

async function updateProductImages(product, newImages, imagesToDelete) {
    // Upload new images to Cloudinary and prepare array for product document
    const uploadedImages = []
    const failedUploads = []
    for (const image of newImages) {
        try {
            const result = await uploadToCloudinary(image.buffer, 'products')
            uploadedImages.push({
                public_id: result.public_id, 
                secure_url: result.secure_url 
            })
        } catch (error) {
            console.error('Error uploading image to Cloudinary: ', error)
            failedUploads.push(image.originalname)
        }
        
    }
    product.images = [
        ...product.images.filter(img => !imagesToDelete.includes(img.public_id)),
        ...uploadedImages
    ]

    return {
        failedUploads,
        uploadedImages: uploadedImages.map(img => img.public_id)}
}

async function deleteImagesFromCloudinary(imagesToDelete) {
    for (const img of imagesToDelete) {
        try {
            await cloudinary.uploader.destroy(img)
        } catch (error) {
            console.error(`Error deleting image ${img} from Cloudinary:`, error)
        }
    }
}

// export async function update({ productId, productsUpdate, newImages, imagesToKeep }) {
//     if (!productId || !isValidObjectId(productId)) {
//         const err = new Error('Valid product ID is required')
//         err.status = 400
//         throw err
//     }
//     // // Update product simple fields first before handling images
//     // await Product.findByIdAndUpdate(productId, productsUpdate, { new: true })
//     console.log('PRODUCT UPDATE SERVICE: ', productsUpdate)
//     console.log('NEW IMAGES: ', newImages)
//     console.log('IMAGES TO KEEP: ', imagesToKeep)

//     // Get current images from product
//     const product = await Product.findById(productId)
//     if (!product) {
//         const err = new Error('Product not found')
//         err.status = 404
//         throw err
//     }

//     const currentImages = product.images
//     console.log('CURRENT IMAGES: ', currentImages)

//     // Upload new images to Cloudinary and prepare array for product document
//     const uplodadedImages = []
//     for (const image of newImages) {
//         console.log(image)
//         const result = await uploadToCloudinary(image.buffer, 'products')
//         uplodadedImages.push({
//             public_id: result.public_id, 
//             secure_url: result.secure_url 
//         })
//     }

//     // Determine which images to delete by filtering out the ones to keep
//     const imagesToDelete = []
//     if (imagesToKeep.length === 0 && currentImages.length > 0) {
//     console.log('NO IMAGES TO KEEP, DELETING ALL CURRENT IMAGES')
//         imagesToDelete.push(...currentImages.map(img => img.public_id))
//     } else {
//         imagesToDelete.push(...currentImages.filter(img => !imagesToKeep.includes(img.public_id)))
//     }
//     console.log('IMAGES TO DELETE: ', imagesToDelete)

//     // Filter out images to delete from product document and add new uploaded images.
//     product.images = [
//         ...product.images.filter(img => imagesToKeep.includes(img.public_id)),
//         ...uplodadedImages
//     ]

//     Object.assign(product, productsUpdate)
//     try {
//         await product.save()
//     } catch (error) {
//         // rollback: delete newly uploaded images from Cloudinary if product save fails
//         for (const img of uplodadedImages) {
//             await cloudinary.uploader.destroy(img.public_id)
//         }
//         console.error('Error updating product images: ', error)
//         throw new Error('Failed to update product images')
//     }
    

//     // Delete images that are in imagesToDelete from Cloudinary
//     for (const img of imagesToDelete) {
//         console.log('DELETING IMAGE WITH PUBLIC ID: ', img.public_id)
//         try {
//             await cloudinary.uploader.destroy(img.public_id)
//         } catch (error) {
//             console.error(`Error deleting image ${img.public_id} from Cloudinary:`, error)
//         }
//     }
//     return product
// }

export async function deleteProduct({ productId }) {
    if (!productId || !isValidObjectId(productId)) {
        const err = new AppError('Valid product ID is required')
        err.status = 400
        throw err
    }

    const result = await Product.deleteOne({ _id: productId })

    if (result.deletedCount === 0) {
        const err = new AppError('Product not found')
        err.status = 404
        throw err
    }

    // Also remove the product from all carts
    await Cart.updateMany(
        { 'items.product': productId },
        { $pull: { items: { product: productId } } }
)

    return { message: 'Product deleted successfully' }
}

export async function softDeleteProduct({ id }) {
    if (!id || !isValidObjectId(id)) {
        const err = new BadRequestError('Valid product ID is required')
        throw err
    }

    const result = await Product.findByIdAndUpdate(id, { status: 'archived' }, { new: true })

    if (!result) {
        const err = new NotFoundError('Product not found')
        throw err
    }

    return result
}

export async function reactivateProduct({ id }) {
    if (!id || !isValidObjectId(id)) {
        const err = new BadRequestError('Valid product ID is required')
        throw err
    }

    const result = await Product.findByIdAndUpdate(id, { status: 'active' }, { new: true })

    if (!result) {
        const err = new NotFoundError('Product not found')
        throw err
    }

    return result
}

export async function decreaseStock(productId, amount) {
    if (!productId || !isValidObjectId(productId)) {
        const err = new AppError('Valid product ID is required')
        err.status = 400
        throw err
    }
    const product = await Product.findOneAndUpdate(
        { _id: productId, 
        stock: { $gte: amount } }, // Ensure enough stock before decreasing
        { $inc: { quantity: -amount } },
        { new: true }
    )
    if (!product) {
        const err = new AppError('Insufficient stock or product not found.')
        err.status = 400
        throw err
    }
    return product
}

export async function releaseStock(productId, amount) {
    if (!productId || !isValidObjectId(productId)) {
        const err = new AppError('Valid product ID is required')
        err.status = 400
        throw err
    }
    const product = await Product.findByIdAndUpdate(productId, { $inc: { quantity: amount } }, { new: true })
    if (!product) {
        const err = new AppError('Product not found.')
        err.status = 404
        throw err
    }
    return product
}

export async function setStock(productId, newStock) {
    if (!productId || !isValidObjectId(productId)) {
        const err = new AppError('Valid product ID is required')
        err.status = 400
        throw err
    }
    const product = await Product.findByIdAndUpdate(productId, { quantity: newStock }, { new: true })
    if (!product) {
        const err = new AppError('Product not found.')
        err.status = 404
        throw err
    }
    return product
}