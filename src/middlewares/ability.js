import { defineAbilitiesFor } from '../casl/abilities.js'
import { UnauthorizedError } from '../errors/UnauthorizedError.js'

export function defineAbilityMiddleware (req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('User not authenticated'))
  }

  req.ability = defineAbilitiesFor(req.user)
  next()
}
