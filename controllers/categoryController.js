import Category from '../models/Product.js'
import 'dotenv/config.js'

export async function getAll (req, res) {
  try {
    const categories = await Category.find({})

    return res.status(200).json({ categories })
  } catch (error) {
    return res.status(500).json({ error })
  }
}
