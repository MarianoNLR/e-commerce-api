import Product from '../models/Product.js'
import 'dotenv/config'
import path, { extname } from 'path'
import { unlink } from 'fs/promises';
import * as productService from '../services/productService.js'
import { sendSuccess } from '../utils/apiResponse.js'

export async function getAll (req, res, next) {
  try {
    const { categoryId } = req.params
    const filters = {}
    if (categoryId) {
      filters.categoryId = categoryId
    }
    const products = await productService.getAll({categoryId, filters})

    return sendSuccess(res, { products }, 200)
  } catch (error) {
    console.error("Error fetching products:", error)
    return next(error)
  }
}

export async function getBySearch (req, res, next) {
  try {

    const { q } = req.query
    const filters = {}
    if (q) {
      filters.name = { $regex: q, $options: 'i' }
    }
    const products = await productService.getAll({ filters })

    return sendSuccess(res, { products }, 200)
  } catch (error) {
    console.error("Error fetching products by search:", error)
    return next(error)
  }
}

export async function getById (req, res, next) {
  try {
    const { productId } = req.params
    const product = await productService.getById({ productId })

    return sendSuccess(res, { product }, 200)
  } catch (error) {
    return next(error)
  }
}

export async function add (req, res, next) {
  try {
    const { name, price, quantity, categoryId, description } = req.body
    const { files : images } = req

    const newProduct = await productService.add({ name, price, quantity, categoryId, description, images })

    return sendSuccess(res, { newProduct }, 201)
  } catch (error) {
    return next(error)
  }
}

export async function update (req, res, next) {
  const { id } = req.params
  const { name, price, quantity, description, imagesToDelete } = req.body
  const { files : newImages } = req
  const productsUpdate = { name, price, quantity, description }
  
  const imagesToDeleteFormat = imagesToDelete ? JSON.parse(imagesToDelete) : []
  try {
    const result = await productService.update({ productId: id, productsUpdate, newImages, imagesToDelete: imagesToDeleteFormat })
    return sendSuccess(res, { result }, 200)
  } catch (error) {
    console.error('Error updating product:', error)
    return next(error)
  }
}

export async function updateProductStock (req, res, next) {
  console.log(req)
  const { productId } = req.params
  const { stock } = req.body

  try {
    const result = await productService.setStock(productId, stock)

    return sendSuccess(res, { result }, 200)
  } catch (error) {
    console.error('Error updating product stock:', error)
    return next(error)
  }
}

export async function deleteProduct (req, res, next) {
  const { id: productId } = req.params

  try {
    await productService.deleteProduct({ productId })
    return sendSuccess(res, { message: 'Product has been removed.' }, 200)
  } catch (error) {
    console.error('Error deleting product:', error)
    return next(error)
  }
}

export async function softDeleteProduct (req, res, next) {
  const { id } = req.params
  try {    
    const result = await productService.softDeleteProduct({ id })
    return sendSuccess(res, { result, message: 'Product has been archived.' }, 200)
  } catch (error) {
    console.error('Error archiving product:', error)
    next(error)
  }
}

export async function reactivateProduct (req, res, next) {
  const { id } = req.params 
  try {
    const result = await productService.reactivateProduct({ id })
    return sendSuccess(res, { result, message: 'Product has been reactivated.' }, 200)
  } catch (error) {
    console.error('Error reactivating product:', error)
    next(error)
  }
}
