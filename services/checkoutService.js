import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import Cart from '../models/Cart.js'
import Order from '../models/Order.js'
import { sendOrderEmail } from '../emailController/emailController.js'
import 'dotenv/config'

const { MP_ACCESS_TOKEN } = process.env

const client = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN
})

const payment = new Payment(client)

export async function setPreferences ({ userId, shipping_info }) {
    const [cart] = await Cart.find({ user: userId }).populate('items.product')
    const preference = new Preference(client)
    const items = []
    console.log('Shipment Info: ', shipping_info)
    if (!cart) return res.status(404).json({ error: 'Cart not found.' })

    console.log(cart.items[0].product)
    for (let i = 0; i < cart.items.length; i++) {
        const productData = cart.items[i].product
        items.push({
        title: productData.name,
        quantity: cart.items[i].quantity,
        unit_price: productData.price
        })
    }
    try {
        const currentOrder = await orderService.createOrder({userId,  shipping_info: req.body.shipping_info })
        const result = await preference.create({
            body: {
                items,
                back_urls: {
                success: 'https://google.com',
                failure: 'https://google.com',
                pending: 'https://google.com'
                },
                auto_return: 'all',
                notification_url: 'https://14b2bab6521b.ngrok-free.app/checkout/webhook',
                external_reference: { userId, orderId: currentOrder.id } // Send object with User ID and orderID
            }
            });
            console.log('PREFERENCES: ', result)
            return result;
        } catch (error) {
            console.error(error)
            throw error
        }
        
}

export async function receiveWebhook ({ paymentInfo }) {
    console.log('PAYMENT INFO: ', paymentInfo)
    try {
        if (paymentInfo.type === 'payment') {
        const paymentData = await payment.get({
            id: paymentInfo['data.id']
        })

        console.log('PAYMENT DATA: ', paymentData)
        const externalReference = JSON.parse(paymentData.external_reference)
        req.params.orderId = externalReference.orderId
        req.body.status = 'paid'
        req.body.payment_id = paymentData.id

        const updatedOrder = await orderService.payWithMercadoPago({ orderId: req.params.orderId, status: req.body.status, paymentId: paymentData.id })
        await Cart.findOneAndDelete({ user: req.userId })
        console.log('UPDATED ORDER: ', updatedOrder)
        await sendOrderEmail(updatedOrder)
        return updatedOrder
        }
    } catch (error) {
        return res.status(500).json({ error })
    }
}