export function checkAbility (action, subject) {
  return (req, res, next) => {
    if (req.ability.can(action, subject)) {
      return next()
    }

    return res.status(403).json({ error: 'Forbidden' })
  }
}
