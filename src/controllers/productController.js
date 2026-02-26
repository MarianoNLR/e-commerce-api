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

    const newProduct = await productService.add({ name, price, quantity, categoryId, description, images })

    return res.status(201).json({ newProduct })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error.' })
  }
}

export async function update (req, res) {
  const { id } = req.params
  const { name, price, quantity, description, imagesToDelete } = req.body
  const { files : newImages } = req
  const productsUpdate = { name, price, quantity, description }
  
  const imagesToDeleteFormat = imagesToDelete ? JSON.parse(imagesToDelete) : []
  try {
    const result = await productService.update({ productId: id, productsUpdate, newImages, imagesToDelete: imagesToDeleteFormat })
    return res.status(200).json({ result })
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

export async function softDeleteProduct (req, res, next) {
  const { id } = req.params
  try {    
    const result = await productService.softDeleteProduct({ id })
    return res.status(200).json({ result, message: 'Product has been archived.' })
  } catch (error) {
    console.error('Error archiving product:', error)
    next(error)
  }
}

export async function reactivateProduct (req, res, next) {
  const { id } = req.params 
  try {
    const result = await productService.reactivateProduct({ id })
    return res.status(200).json({ result, message: 'Product has been reactivated.' })
  } catch (error) {
    console.error('Error reactivating product:', error)
    next(error)
  }
}
