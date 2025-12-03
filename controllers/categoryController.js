import Category from '../models/Category.js'
import * as categoryService from '../services/categoryService.js'
import 'dotenv/config.js'

export async function getAll (req, res) {
  try {
    const categories = await categoryService.getAll()

    return res.status(200).json({ categories })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error.' })
  }
}

export async function addCategory (req, res) {
  try {
    const { name, parent } = req.body

    // if (!parent) {
    //   // New Category
    //   const newCategory = new Category({ name })
    //   const result = await newCategory.save()

    //   console.log({ result })
    //   return res.status(201).json({ result })
    // } else {
    //   // New Subcategory
    //   const newCategory = new Category({ name, parent_id: parent })
    //   const result = await newCategory.save()

    //   console.log({ result })
    //   return res.status(201).json({ result })
    // }
    const result = await categoryService.addCategory({ name, parent })
    return res.status(201).json({ result })

  } catch (error) {
    console.log('Error trying to create category:', error)
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error.' })
  }
}
