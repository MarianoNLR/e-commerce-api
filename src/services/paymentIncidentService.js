import PaymentIncident from '../models/PaymentIncident.js'
import { BadRequestError } from '../errors/BadRequestError.js'
import { NotFoundError } from '../errors/NotFoundError.js'

export async function recordExpiredPayment ({ order, paymentId, amount }) {
  const filter = { provider: 'mercadopago', payment_id: String(paymentId) }
  const fields = { ...filter, order: order._id, amount, reason: 'approved_after_expiration' }
  let incident
  try {
    incident = await PaymentIncident.findOneAndUpdate(filter, { $setOnInsert: fields }, {
      upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true
    })
  } catch (error) {
    if (error.code !== 11000) throw error
    incident = await PaymentIncident.findOne(filter)
  }
  if (!incident || !incident.order.equals(order._id) || incident.amount !== amount) {
    throw new BadRequestError('Payment incident does not match the order.')
  }
  return incident
}

export async function listPaymentIncidents ({ status }) {
  return await PaymentIncident.find(status ? { status } : {}).sort({ createdAt: -1 })
}

export async function resolveManualRefund ({ incidentId, userId, refundReference, note }) {
  const incident = await PaymentIncident.findOneAndUpdate(
    { _id: incidentId, status: 'pending_review' },
    { $set: {
      status: 'resolved',
      resolution: {
        type: 'refund', mode: 'manual', replacement_order_id: null,
        refund_reference: refundReference || null, note: note || null,
        resolved_by: userId, resolved_at: new Date()
      }
    } },
    { new: true, runValidators: true }
  )
  if (incident) return incident
  if (!await PaymentIncident.exists({ _id: incidentId })) throw new NotFoundError('Payment incident not found.')
  throw new BadRequestError('Payment incident is already resolved.')
}
