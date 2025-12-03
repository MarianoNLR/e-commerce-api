import Product from '../models/Product.js'
import 'dotenv/config'
import path, { extname } from 'path'
import { unlink } from 'fs/promises';
import * as productService from '../services/productService.js'

export async function getAll (req, res) {
  try {
    const { categoryId } = req.params
    const filters = {}
    if (categoryId) {
      filters.categoryId = categoryId
    }
    const products = await productService.getAll({categoryId, filters})

    return res.status(200).json({ products })
  } catch (error) {
    console.error("Error fetching products:", error)
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error.' })
  }
}

export async function getBySearch (req, res) {


  try {

    const { q } = req.query
    const filters = {}
    if (q) {
      filters.name = { $regex: q, $options: 'i' }
    }
    const products = await productService.getAll({ filters })

    return res.status(200).json({ products })
  } catch (error) {
    console.error("Error fetching products by search:", error)
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error.' })
  }
}

export async function getById (req, res) {
  try {
    const { productId } = req.params
    const product = await productService.getById({ productId })

    return res.status(200).json({ product })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error.' })
  }
}

export async function add (req, res) {
  try {
    const { name, price, quantity, categoryId, description } = req.body
    const { files : images } = req

    await productService.add({ name, price, quantity, categoryId, description, images })

    return res.status(201).json({ newProduct })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error.' })
  }
}

export async function update (req, res) {
  const { id } = req.params
  const { name, price, quantity, description, imagesToKeep = [] } = req.body
  const { files : newImages } = req
  const productsUpdate = { name, price, quantity, description }
  
  
  //console.log(req)
  try {
    // // Update product simple fields first before handling images
    // await Product.findByIdAndUpdate(id, productsUpdate)

    // // Get current images from product
    // const currentImages = await Product.findById(id).select('imagesURLs -_id')

    // // Determine which images to delete by filtering out the ones to keep
    // const toDelete = []
    // if (imagesToKeep.length === 0) {
    //     toDelete.push(...currentImages.imagesURLs)
    // } else {
    //   toDelete = currentImages.imagesURLs.filter(img => !imagesToKeep.includes(img))
    // }
    

    // //Delete images that are not in imagesToKeep from uploads folder and from product document
    // for (const image of toDelete) { 
    //   try {
    //     const imgPath = path.join(process.cwd(), 'uploads', image)
    //     await unlink(imgPath)
    //   } catch (error) {
    //     if (error.code !== 'ENOENT') {
    //       console.error(`File ${image} not found, skipping deletion.`)
    //     }
    //   }
    //   await Product.updateOne({ _id: id }, { $pull: { imagesURLs: image } })
    // }

    // // Add new images to product document
    // const newImagesURLs = [];
    // if (newImages && newImages.length > 0) {
    //   for (const image of newImages) {
    //     newImagesURLs.push(image.filename);
    //   }
    //   await Product.updateOne({ _id: id }, { $push: { imagesURLs: { $each: newImagesURLs } } });
    // }
    // const updatedProduct = await Product.findById(id)
    // res.status(200).json({ result: updatedProduct })
    const result = await productService.update({ productId: id, productsUpdate, newImages, imagesToKeep })
  } catch (error) {
    console.error('Error updating product:', error)
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error.' })
  }
}

export async function updateProductStock (req, res) {
  console.log(req)
  const { productId } = req.params
  const { stock } = req.body

  try {
    const result = await productService.setStock(productId, stock)

    return res.status(200).json({ result })
  } catch (error) {
    console.error('Error updating product stock:', error)
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error.' })
  }
}

export async function deleteProduct (req, res) {
  const { id: productId } = req.params

  try {
    await productService.deleteProduct({ productId })
    return res.status(200).json({ message: 'Product has been removed.' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error.' })
  }
}

// export async function updateProductStockPurchase (req, res) {
//   try {
//     const product = await Product.findById(productId)
//     if (product) {
//       product.quantity -= quantity
//       await product.save()
//       return true
//     }
//     return false
//   } catch (error) {
//     console.error('It seems there was an error with product stock:', error)
//     return false
//   }
// }
