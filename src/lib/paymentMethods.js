export const PAYMENT_METHODS = Object.freeze({
  MERCADO_PAGO: 'mercadopago',
  BANK_TRANSFER: 'bank_transfer'
})

export const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHODS)

export function isPaymentMethod (paymentMethod) {
  return PAYMENT_METHOD_VALUES.includes(paymentMethod)
}
