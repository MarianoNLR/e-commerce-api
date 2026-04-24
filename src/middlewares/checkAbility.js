import { AppError } from '../errors/AppError.js'

export function checkAbility (action, subject) {
  return (req, res, next) => {
    if (req.ability.can(action, subject)) {
      return next()
    }

    return next(new AppError('Forbidden', 403, 'FORBIDDEN'))
  }
}
