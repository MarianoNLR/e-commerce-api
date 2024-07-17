import Product from '../models/Product.js'
import jwt from 'jsonwebtoken'
import 'dotenv/config'

const { JWT_SECRET } = process.env

export async function getAll (req, res) {
  try {
    const products = await Product.find({})

    return res.status(200).json({ products })
  } catch (error) {
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
  const { name, price, quantity } = req.body

  try {
    const newProduct = new Product({ name, price, quantity })
    await newProduct.save()

    return res.status(201).json({ newProduct })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export async function update (req, res) {
  const { productId } = req.params
  const { name, price, quantity } = req.body

  try {
    const updatedProduct = await Product.findByIdAndUpdate(productId, { name, price, quantity })

    return res.status(200).json({ result: updatedProduct })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export async function deleteProduct (req, res) {
  const { productId } = req.params

  const productExists = await Product.findById(productId)

  if (!productExists) return res.status(404).json({ message: 'Product not found.' })

  try {
    await Product.deleteOne({ _id: productId })
    return res.status(200).json({ message: 'Product has been removed.' })
  } catch (error) {
    return res.status(500).json({ error })
  }
}
