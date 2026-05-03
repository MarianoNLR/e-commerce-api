import { createMercadoPagoStrategy } from './strategies/MercadoPagoStrategy.js'
import { createBankTransferStrategy } from './strategies/BankTransferStrategy.js'

const strategies = {
  mercadopago: createMercadoPagoStrategy({ accessToken: process.env.MP_ACCESS_TOKEN }),
  bank_transfer: createBankTransferStrategy()
}

export function getPaymentStrategy(paymentMethod) {
  const strategy = strategies[paymentMethod]
  if (!strategy) {
    throw new Error(`Unsupported payment method: ${paymentMethod}`)
  }
  return strategy
}
