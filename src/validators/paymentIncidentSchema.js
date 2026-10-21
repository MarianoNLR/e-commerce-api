import * as z from 'zod'

export const listPaymentIncidentsSchema = z.object({
  query: z.strictObject({ status: z.enum(['pending_review', 'resolved']).optional() })
})

export const resolvePaymentIncidentSchema = z.object({
  params: z.object({ incidentId: z.string().regex(/^[0-9a-fA-F]{24}$/) }),
  body: z.strictObject({
    refund_reference: z.string().trim().min(1).max(200).optional(),
    note: z.string().trim().min(1).max(1000).optional()
  }).refine(value => value.refund_reference || value.note, {
    message: 'A refund reference or note is required.'
  })
})
