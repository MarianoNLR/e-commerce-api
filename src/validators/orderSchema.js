import * as z from 'zod'

const shippingInfoSchema = z.strictObject({
  name: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().min(1),
  state: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(1),
  zip: z.string().min(1),
  observations: z.string().optional()
})

export const updateOrderSchema = z.object({
  body: z.strictObject({
    shipping_info: shippingInfoSchema
  })
})
