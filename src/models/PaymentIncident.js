import { Schema, model } from 'mongoose'

const resolutionSchema = new Schema({
  type: { type: String, enum: ['refund'], required: true },
  mode: { type: String, enum: ['manual'], required: true },
  replacement_order_id: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
  refund_reference: { type: String, default: null },
  note: { type: String, default: null },
  resolved_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  resolved_at: { type: Date, required: true }
}, { _id: false })

const paymentIncidentSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  provider: { type: String, required: true, enum: ['mercadopago'] },
  payment_id: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true, enum: ['approved_after_expiration'] },
  status: { type: String, required: true, enum: ['pending_review', 'resolved'], default: 'pending_review' },
  resolution: { type: resolutionSchema, default: null }
}, { timestamps: true })

paymentIncidentSchema.index({ provider: 1, payment_id: 1 }, { unique: true })

export default model('PaymentIncident', paymentIncidentSchema)
