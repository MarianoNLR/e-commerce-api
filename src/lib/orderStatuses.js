export const ORDER_STATUSES = Object.freeze({
  PENDING_PAYMENT: 'pending_payment',
  PENDING_VALIDATION: 'pending_validation',
  PAID: 'paid',
  PAYMENT_FAILED: 'payment_failed',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
})

export const ORDER_STATUS_VALUES = Object.freeze(Object.values(ORDER_STATUSES))
