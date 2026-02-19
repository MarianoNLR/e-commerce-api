import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import Cart from '../models/Cart.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import * as orderService from './orderService.js'
import { sendOrderEmail } from '../emailController/emailController.js'
import 'dotenv/config'
import { AppError } from '../errors/AppError.js'
import { NotFoundError } from '../errors/NotFoundError.js'

const MP_STATUS_MAP = Object.freeze({
    approved: 'paid',
    pending: 'pending_payment',
    authorized: 'pending_payment',
    rejected: 'payment_failed',
    in_process: 'pending_payment',
    //refunded: 'refunded',
    //charged_back: 'cancelled',
    cancelled: 'cancelled'
})

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
    if (!cart) throw new AppError('Cart not found for user.', 404)

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
        const {newOrder} = await orderService.createOrder({userId,  shippingInfo: shipping_info})
        console.log('Current Order in setPreferences: ', newOrder)
        const result = await preference.create({
            body: {
                items,
                back_urls: {
                success: 'https://google.com',
                failure: 'https://google.com',
                pending: 'https://google.com'
                },
                auto_return: 'all',
                notification_url: 'https://fd18-2803-9800-94c2-8fe5-5448-82e8-efa9-c968.ngrok-free.app/api/v1/checkout/webhook',
                external_reference: newOrder._id,
                expires: true,
                expiration_date_from: new Date(),
                expiration_date_to: new Date(Date.now() + 30 * 60 * 1000) // Expira en 30 minutos
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
    console.log('PAYMENT INFO EN RECIEVE WEBHOOK SERVICE: ', paymentInfo)
    const eventType = paymentInfo.type || paymentInfo.topic
    if (eventType !== 'payment') return

    const paymentId = paymentInfo['data.id'] || paymentInfo.id
    console.log('Received payment webhook with ID:', paymentId)
    const paymentData = await payment.get({
        id: paymentId
    })

    const { status, transaction_amount, id } = paymentData
    const externalReference = paymentData.external_reference

    console.log('PAYMENT DATA: ', status, transaction_amount, id, externalReference)

    const order = await Order.findById(externalReference)
    if (!order) {
        console.error('Order not found for ID:', externalReference)
        throw new NotFoundError('Order not found.');
    }

    // Idempotency check
    if (order.payment_id === id) return order

    // Validate payment amount
    if (order.total !== transaction_amount) {
        console.error('Payment amount does not match order total. Order ID:', externalReference.orderId)
        throw new AppError('Payment amount mismatch.', 400);
    }

    let newStatusOrder = MP_STATUS_MAP[status]
    if (!newStatusOrder) {
        console.error('Unknown payment status received from MercadoPago:', status)
        throw new AppError('Unknown payment status.', 400);
    }

    if (order.status === newStatusOrder) return order;

    const updatedOrder = await Order.findOneAndUpdate({
        _id: externalReference,
        status: 'pending_payment', // Only update if currently pending payment
        payment_id: { $ne: id.toString() }
    }, {
        $set: {
            status: newStatusOrder,
            payment_id: id.toString()
        }
    },{ new: true })
    
    if (!updatedOrder) {
        // This means the order was not found or it has already been updated with this payment ID (idempotency)
        return
    }

    if (order.status === 'pending_payment' && 
    (newStatusOrder === 'payment_failed' || newStatusOrder === 'cancelled')) {
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: item.quantity } }
            )
        }
    }

    if (newStatusOrder === 'paid') {
        await Cart.findOneAndDelete({ user: updatedOrder.user });
        await sendOrderEmail(updatedOrder)
    }
    
    return updatedOrder
}