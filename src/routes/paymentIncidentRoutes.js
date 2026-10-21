import { Router } from 'express'
import { authUser } from '../middlewares/authUser.js'
import { defineAbilityMiddleware } from '../middlewares/ability.js'
import { checkAbility } from '../middlewares/checkAbility.js'
import { validate } from '../middlewares/validate.js'
import { listPaymentIncidentsSchema, resolvePaymentIncidentSchema } from '../validators/paymentIncidentSchema.js'
import { listPaymentIncidents, resolveManualRefund } from '../services/paymentIncidentService.js'
import { sendSuccess } from '../utils/apiResponse.js'

const paymentIncidentRouter = Router()
paymentIncidentRouter.use(authUser, defineAbilityMiddleware, checkAbility('manage', 'Order'))

paymentIncidentRouter.get('/', validate(listPaymentIncidentsSchema), async (req, res, next) => {
  try {
    return sendSuccess(res, { incidents: await listPaymentIncidents({ status: req.query.status }) })
  } catch (error) { return next(error) }
})

paymentIncidentRouter.patch('/:incidentId/resolve', validate(resolvePaymentIncidentSchema), async (req, res, next) => {
  try {
    const incident = await resolveManualRefund({
      incidentId: req.params.incidentId, userId: req.userId,
      refundReference: req.body.refund_reference, note: req.body.note
    })
    return sendSuccess(res, { incident })
  } catch (error) { return next(error) }
})

export default paymentIncidentRouter
