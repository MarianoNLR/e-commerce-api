import { defineAbilitiesFor } from '../casl/abilities.js'

export function defineAbilityMiddleware (req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' })
  }

  req.ability = defineAbilitiesFor(req.user)
  next()
}
