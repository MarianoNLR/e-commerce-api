import Product from '../models/Product.js'
import 'dotenv/config'
import path, { extname } from 'path'
import { unlink } from 'fs/promises';

export async function getAll (req, res) {
  const { categoryId } = req.params
  const filters = {}

  if (categoryId) {
    filters.categoryId = categoryId
  }

  try {
    const products = await Product.find(filters).collation({ locale: 'es', strength: 2 }).sort({ price: -1 })
      .populate('categoryId')

    return res.status(200).json({ products })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error })
  }
}

export async function getBySearch (req, res) {
  const { q } = req.query
  const filters = {}
  console.log(q)
  if (q) {
    filters.name = { $regex: q, $options: 'i' }
  }

  try {
    const products = await Product.find(filters)
      .populate('categoryId')

    return res.status(200).json({ products })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error })
  }
}

export async function getById (req, res) {
  const { productId } = req.params

  try {
    const product = await Product.findById(productId)

    if (!product) return res.status(404).json({ message: 'Product not found.' })

    return res.status(200).json({ product })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export async function add (req, res) {
  const { name, price, quantity, categoryId, description, deletedImages } = req.body
  const { files : images } = req
  const imagesURLs = []
  
  images.filter().forEach(image => {
    const fileExtension = extname(image.originalname)
    const fileName = image.filename.split(fileExtension)[0]
    const fileFullName = `${fileName}${fileExtension}`
    imagesURLs.push(fileFullName)
  });
  
  try {
    const newProduct = new Product(
      {
        name,
        price,
        quantity,
        categoryId,
        description,
        imagesURLs: imagesURLs
      })
    await newProduct.save()

    return res.status(201).json({ newProduct })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export async function update (req, res) {
  const { id } = req.params
  const { name, price, quantity, description, imagesToKeep = [] } = req.body
  const { files : newImages } = req
  const productsUpdate = { name, price, quantity, description }
  
  
  //console.log(req)
  try {
    // Update product simple fields first before handling images
    await Product.findByIdAndUpdate(id, productsUpdate)

    // Get current images from product
    const currentImages = await Product.findById(id).select('imagesURLs -_id')

    // Determine which images to delete by filtering out the ones to keep
    const toDelete = []
    if (imagesToKeep.length === 0) {
        toDelete.push(...currentImages.imagesURLs)
    } else {
      toDelete = currentImages.imagesURLs.filter(img => !imagesToKeep.includes(img))
    }
    

    //Delete images that are not in imagesToKeep from uploads folder and from product document
    for (const image of toDelete) { 
      try {
        const imgPath = path.join(process.cwd(), 'uploads', image)
        await unlink(imgPath)
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`File ${image} not found, skipping deletion.`)
        }
      }
      await Product.updateOne({ _id: id }, { $pull: { imagesURLs: image } })
    }

    // Add new images to product document
    const newImagesURLs = [];
    if (newImages && newImages.length > 0) {
      for (const image of newImages) {
        newImagesURLs.push(image.filename);
      }
      await Product.updateOne({ _id: id }, { $push: { imagesURLs: { $each: newImagesURLs } } });
    }
    const updatedProduct = await Product.findById(id)
    res.status(200).json({ result: updatedProduct })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error })
  }
}

export async function updateProductStock (req, res) {
  console.log(req)
  const { productId } = req.params
  const { stock } = req.body
  console.log(stock)

  try {
    const updatedProduct = await Product.findByIdAndUpdate(productId, { quantity: stock }, { new: true })

    if (!updatedProduct) return res.status(404).json({ message: 'Product not found.' })

    return res.status(200).json({ result: updatedProduct })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export async function deleteProduct (req, res) {
  const { id: productId } = req.params
  console.log(productId)
  const productExists = await Product.findById(productId)

  if (!productExists) return res.status(404).json({ message: 'Product not found.' })

  try {
    await Product.deleteOne({ _id: productId })
    return res.status(200).json({ message: 'Product has been removed.' })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export async function updateProductStockPurchase (productId, quantity) {
  try {
    const product = await Product.findById(productId)
    if (product) {
      product.quantity -= quantity
      await product.save()
      return true
    }
    return false
  } catch (error) {
    console.error('It seems there was an error with product stock:', error)
    return false
  }
}
