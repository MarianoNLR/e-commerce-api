import Category from '../models/Category.js'
import * as categoryService from '../services/categoryService.js'
import 'dotenv/config.js'
import { sendSuccess } from '../utils/apiResponse.js'

export async function getAll (req, res, next) {
  const { includeCount } = req.query
  try {
    const categories = includeCount
      ? await categoryService.getAllWithCount()
      : await categoryService.getAll()

    return sendSuccess(res, { categories }, 200)
  } catch (error) {
    return next(error)
  }
}

export async function getCategoryById (req, res, next) {
  const { categoryId } = req.params
  const { includeCount } = req.query

  try {
    const category = includeCount 
      ? await categoryService.getCategoryWithCount({categoryId}) 
      : await categoryService.getCategoryById({categoryId})

    return sendSuccess(res, { category }, 200)
  } catch (error) {
    return next(error)
  }
}

export async function addCategory (req, res, next) {
  try {
    const { name, parent } = req.body
    const result = await categoryService.addCategory({ name, parent })
    return sendSuccess(res, { result }, 201)

  } catch (error) {
    console.error('Error trying to create category:', error)
    return next(error)
  }
}

export async function deleteCategory (req, res, next) {
  try {
    const { categoryId } = req.params
    const result = await categoryService.deleteCategory(categoryId)
    return sendSuccess(res, { result }, 200)
  } catch (error) {
    return next(error)
  }
}

export async function updateCategory (req, res, next) {
  try {
    const { categoryId } = req.params
    const { name } = req.body
    const result = await categoryService.updateCategory(categoryId, { name })
    return sendSuccess(res, { result }, 200)
  } catch (error) {
    return next(error)
  }
}