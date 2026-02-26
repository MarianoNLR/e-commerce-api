import { AbilityBuilder, createMongoAbility } from '@casl/ability'
import User from '../models/User.js'
import Product from '../models/Product.js'
import Category from '../models/Category.js'

export function defineAbilitiesFor (user) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility)

  if (user.role === 'admin') {
    can('manage', 'all')// admin can do everything
  } else if (user.role === 'moderator') {
    can('read', 'all')
    can('manage', 'Product')
    can('manage', 'Category')
    cannot('update', 'User')
    cannot('delete', 'User')
  } else {
    can('read', 'Product')
    can('update', 'User', { _id: user.id }) // users can update their own profile
    can('read', 'Category')
    can('create', 'Order')
    can('read', 'Order', { user: user.id }) // users can read their own orders
  }

  return build()
}
