import Product from "../models/Product.js"
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import path, { extname } from "path";
import { unlink } from "fs/promises";
import 'dotenv/config'

export async function getAll({categoryId, filters}) {
    if (categoryId) {
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

export async function getBySearch({q, filters}) {

    if (q) {
      filters.name = { $regex: q, $options: 'i' }
    }

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
    const product = await Product.findById(productId)

    if (!product) {
        const err = new Error('Product not found')
        err.status = 404
        throw err
    }
    return product
}

export async function add({ name, price, quantity, categoryId, description, images }) {
    const imagesURLs = []
    const imagesUploads = images.map(image => uploadToCloudinary(image.buffer, 'products'))
    const imagesResults = await Promise.all(imagesUploads)
    imagesResults.forEach(result => imagesURLs.push(result.secure_url))
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
        imagesURLs: imagesURLs
    })
    console.log('NEW PRODUCT SERVICE: ', newProduct)
    const result = await newProduct.save()
    return result
}

export async function update({ productId, productsUpdate, newImages, imagesToKeep }) {
    // Update product simple fields first before handling images
    await Product.findByIdAndUpdate(productId, productsUpdate, { new: true })

    // Get current images from product
    const currentImages = await Product.findById(productId).select('imagesURLs -_id')

     // Determine which images to delete by filtering out the ones to keep
    const imagesToDelete = []
    if (imagesToKeep.length === 0) {
        imagesToDelete.push(...currentImages.imagesURLs)
    } else {
        imagesToDelete.push(...currentImages.imagesURLs.filter(img => !imagesToKeep.includes(img)))
    }

    //Delete images that are not in imagesToKeep from uploads folder and from product document
    for (const image of imagesToDelete) {
        try {
            const imagePath = path.join(process.cwd(), process.env.UPLOADS_FOLDER, image)
            await unlink(imagePath)
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`File ${image} not found.`, error)
            }
        }
        await Product.updateOne({ _id: productId }, { $pull: { imagesURLs: image } })
    }

    // Add new images to product document
    const newImagesURLs = []
    if (newImages && newImages.length > 0) {
        for (const image of newImages) {
            newImagesURLs.push(image.filename)
        }
        await Product.updateOne({ _id: productId }, { $push: { imagesURLs: { $each: newImagesURLs } } })
    }

    const updatedProduct = await Product.findById(productId)
    return updatedProduct
}

export async function deleteProduct({ productId }) {
    const result = await Product.deleteOne({ _id: productId })

    if (result.deletedCount === 0) {
        const err = new Error('Product not found')
        err.status = 404
        throw err
    }

    return { message: 'Product deleted successfully' }
}

export async function updateProductStock({ productId, update}) {
    return await Product.findByIdAndUpdate(productId, update, { new: true })

}

export async function decreaseStock(productId, amount) {
    return updateProductStock({ productId, update: { $inc: { quantity: -amount } } })
}

export async function setStock(productId, newStock) {
    return updateProductStock({ productId, update: { quantity: newStock } })
}