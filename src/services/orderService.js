import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import * as productService from './productService.js';
import { clearCartByUserId } from './cartService.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { BadRequestError } from '../errors/BadRequestError.js';
import mongoose from 'mongoose';
import { sendOrderEmail } from '../emailController/emailController.js';
import { OrderStateMachine } from '../lib/OrderStateMachine.js';
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js';
import { PAYMENT_METHODS, isPaymentMethod } from '../lib/paymentMethods.js';
import { ORDER_STATUSES } from '../lib/orderStatuses.js';

export async function getOrders({ filter, page = 1, limit = 5 }) {
    const skip = (page - 1) * limit;
    console.log('FILTER IN SERVICE GET ORDERS: ', filter)
    const orders = await Order.find(filter)
        .populate('user', '-password')
        //.populate('items')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    const totalOrders = await Order.countDocuments(filter);
    const hasMore = skip + orders.length < totalOrders;

    return { orders, hasMore, currentPage: page, totalOrders };
}

export async function getOrderById(orderId, filter) {
    const order = await Order.findById({
        _id: orderId,
        ...filter
    })
    .populate('user', '-password')
    .populate('items');
    
    if (order) {
        return order ;
    } else {
        throw new NotFoundError('Order not found.');
    }
}

export async function updateOrderStatus({ orderId, status, filter }) {
    const order = await transitionOrderStatus({
        orderId,
        newStatus: status,
        filter
    })

    return { order }
}

/**
 * Applies an order status transition and its inventory side effects atomically.
 *
 * Cancellations, failed payments, and expirations release the inventory
 * reserved when the order was created.
 * The conditional update makes a repeated request observe the terminal status
 * instead of returning the same inventory twice.
 */
export async function transitionOrderStatus({ orderId, newStatus, filter = {}, paymentId }) {
    const session = await mongoose.startSession()

    try {
        let updatedOrder

        await session.withTransaction(async () => {
            const order = await Order.findOne({ _id: orderId, ...filter }).session(session)

            if (!order) {
                throw new NotFoundError('Order not found.')
            }

            const stateMachine = new OrderStateMachine(order)
            if (!stateMachine.canTransitionTo(newStatus)) {
                throw new BadRequestError(`Invalid state transition from ${order.status} to ${newStatus}.`)
            }

            const statusUpdate = { status: newStatus }
            if (paymentId !== undefined && paymentId !== null) {
                statusUpdate.payment_id = paymentId.toString()
            }

            updatedOrder = await Order.findOneAndUpdate(
                { _id: order._id, status: order.status },
                { $set: statusUpdate },
                { new: true, session }
            )

            // The transaction may be retried after a concurrent write. Do not
            // release stock unless this transaction changed the pending order.
            if (!updatedOrder) {
                throw new BadRequestError('Order status changed before the transition could be completed.')
            }

            if ([ORDER_STATUSES.CANCELLED, ORDER_STATUSES.PAYMENT_FAILED, ORDER_STATUSES.PAYMENT_REJECTED, ORDER_STATUSES.EXPIRED].includes(newStatus)) {
                for (const item of order.items) {
                    // Orders keep an item snapshot. If an administrator removed
                    // the current product document, there is no inventory left to
                    // restore for that item. Other database errors must still
                    // abort the transaction.
                    await productService.releaseStock(item.productId, item.quantity, session, { ignoreMissing: true })
                }
            }
        })

        return updatedOrder
    } finally {
        await session.endSession()
    }
}

// export async function payWithMercadoPago({ orderId, status, paymentId }) {
//     const order = await Order.findByIdAndUpdate(orderId, { status, payment_id: paymentId }, { new: true });
//     if (!order) {
//         throw new NotFoundError('Order not found.');  
//     }

//     // TODO: transactional stock update, if one fails, rollback order status update
//     for (let i = 0; i < order.items.length; i++) {
//         console.log(order.items[i].productId, order.items[i].quantity)
//         if (!await productService.decreaseStock(order.items[i].productId, order.items[i].quantity)) {
//             console.error('Error updating product stock.')
//             return
//         }
//     }
//     return { order };
// }

export async function updateOrder(orderId, updateData) {
    const order = await Order.findByIdAndUpdate(
        orderId,
        { $set: { shipping_info: updateData.shipping_info } },
        { new: true, runValidators: true }
    );
    if (!order) {
        throw new NotFoundError('Order not found.');   
    }
    return { order };
}

export async function createOrder({ userId, shippingInfo, paymentMethod }) {
    if (!isPaymentMethod(paymentMethod)) {
        throw new BadRequestError('Invalid payment method.')
    }

    const session = await mongoose.startSession();

    try {
        let newOrder

        await session.withTransaction(async () => {
            const cartUser = await Cart.findOne({ user: userId })
                .populate('items.product')
                .session(session)

            if (!cartUser) {
                throw new NotFoundError('Cart not found.')
            }

            if (cartUser.items.length === 0) {
                throw new BadRequestError('Cart must contain at least one item.')
            }

            console.log('Cart User in create order: ', cartUser)
            const total = cartUser.items.reduce((sum, item) => {
                return sum + item.product.price * item.quantity
            }, 0)

            for (const item of cartUser.items) {
                console.log('Decreasing stock for product: ', item.product._id, ' quantity: ', item.quantity)
                await productService.decreaseStock(item.product._id, item.quantity, session)
            }

            newOrder = new Order({
                user: userId,
                items: cartUser.items.map(item => ({
                    productId: item.product._id,
                    name: item.product.name,
                    description: item.product.description,
                    priceAtPurchase: item.product.price,
                    quantity: item.quantity
                })),
                total,
                shipping_info: shippingInfo,
                payment_method: paymentMethod,
                status: ORDER_STATUSES.PENDING_PAYMENT
            })

            await newOrder.save({ session })
            await clearCartByUserId(userId, session)
        })

        console.log('New Order Created: ', newOrder)
        return { newOrder }

    } finally {
        await session.endSession()
    }
}

export async function getOrderForPayment({ orderId, userId, paymentMethod }) {
    if (!isPaymentMethod(paymentMethod)) {
        throw new BadRequestError('Invalid payment method.')
    }

    const order = await Order.findOne({ _id: orderId, user: userId })
    if (!order) {
        throw new NotFoundError('Order not found.')
    }

    if (order.payment_method !== paymentMethod) {
        throw new BadRequestError('Payment method does not match the order.')
    }

    if (order.status !== ORDER_STATUSES.PENDING_PAYMENT) {
        throw new BadRequestError('Order is not available for payment.')
    }

    return order
}

export async function savePaymentPreference({ orderId, preferenceId }) {
    const order = await Order.findByIdAndUpdate(
        orderId,
        { payment_preference_id: preferenceId },
        { new: true }
    )

    if (!order) {
        throw new NotFoundError('Order not found.')
    }

    return order
}

export async function uploadPaymentProof({ orderId, filter, file }) {
    const order = await Order.findOne({ _id: orderId, ...filter })
    if (!order) {
        throw new NotFoundError('Order not found.')
    }

    if (order.payment_method !== PAYMENT_METHODS.BANK_TRANSFER) {
        throw new BadRequestError('Payment proof is only available for bank transfers.')
    }

    if (order.status !== ORDER_STATUSES.PENDING_PAYMENT) {
        throw new BadRequestError('Order is not available for payment proof.')
    }

    const uploadResult = await uploadToCloudinary(file.buffer, 'orders/payment_proofs')

    const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, ...filter, payment_method: PAYMENT_METHODS.BANK_TRANSFER, status: ORDER_STATUSES.PENDING_PAYMENT },
        {
            proof_of_payment_url: uploadResult.secure_url,
            status: ORDER_STATUSES.PENDING_VALIDATION
        },
        { new: true }
    )

    if (!updatedOrder) {
        throw new NotFoundError('Order not found.')
    }

    return {
        order: updatedOrder,
        proof_of_payment_url: uploadResult.secure_url
    }
}

// This function is used to process payment status changes from MercadoPago, 
// ensuring valid state transitions and handling side effects like stock release and email notifications.
export async function processPaymentStatusChange({ order, newStatus, paymentId, userId }) {
    const updatedOrder = await transitionOrderStatus({
        orderId: order._id,
        newStatus,
        paymentId
    })

    if (newStatus === ORDER_STATUSES.PAID) {
        await clearCartByUserId(userId)
        await sendOrderEmail(updatedOrder)
    }
    return updatedOrder;
}
