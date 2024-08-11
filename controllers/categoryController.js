import Category from '../models/Category.js'
import 'dotenv/config.js'

export async function getAll (req, res) {
  try {
    const categories = await Category.find({})

    return res.status(200).json({ categories })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export async function addCategory (req, res) {
  try {
    const { name, parent } = req.body

    if (!name || name.lenght < 2) {
      return res.status(405).json({ error: 'Name of category must have more than 2 letters.' })
    }

    if (!parent) {
      // New Category
      const newCategory = new Category({ name })
      const result = await newCategory.save()

      console.log({ result })
      return res.status(201).json({ result })
    } else {
      // New Subcategory
      const newCategory = new Category({ name, parent_id: parent })
      const result = await newCategory.save()

      console.log({ result })
      return res.status(201).json({ result })
    }
  } catch (error) {
    console.log(error)
    return res.json({ error })
  }
}
