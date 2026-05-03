import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import * as productService from './productService.js';
import { clearCartByUserId } from './cartService.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { BadRequestError } from '../errors/BadRequestError.js';
import { AppError } from '../errors/AppError.js';
import mongoose from 'mongoose';
import { sendOrderEmail } from '../emailController/emailController.js';
import { OrderStateMachine } from '../lib/OrderStateMachine.js';
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js';

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
    const order = await Order.findOneAndUpdate({_id: orderId, ...filter}, { status }, { new: true });
    if (!order) {
        throw new NotFoundError('Order not found.'); 
    }
    return { order };
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
    const order = await Order.findByIdAndUpdate(orderId, updateData, { new: true });
    if (!order) {
        throw new NotFoundError('Order not found.');   
    }
    return { order };
}

export async function createOrder({ userId, shippingInfo }) {
    const cartUser = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cartUser) {
        throw new NotFoundError('Cart not found.');   
    }
    console.log("Cart User in create order: ", cartUser)
    // Transactional stock update and order creation
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        // recalculate total price
        const total = cartUser.items.reduce((total, item) => {
            return total + item.product.price * item.quantity;
        }, 0);

        for (const item of cartUser.items) {
            console.log('Decreasing stock for product: ', item.product._id, ' quantity: ', item.quantity)

            const updated = await productService.decreaseStock(item.product._id, item.quantity, session)

            if (!updated) {
                throw new BadRequestError(`Insufficient stock for product ${item.product.name}`);
            }
        }

        const newOrder = new Order({
            user: userId,
            items: cartUser.items.map(item => ({
                productId: item.product._id,
                name: item.product.name,
                description: item.product.description,
                priceAtPurchase: item.product.price,
                quantity: item.quantity
            })),
            total: total,
            shipping_info: shippingInfo,
            status: 'pending_payment'
        });

        // await Cart.findOneAndDelete({ user: userId });
        await clearCartByUserId(userId)
        await newOrder.save({ session });

        await session.commitTransaction();
        session.endSession();

        console.log('New Order Created: ', newOrder)
        return { newOrder };

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

export async function uploadPaymentProof({ orderId, filter, file }) {
    const uploadResult = await uploadToCloudinary(file.buffer, 'orders/payment_proofs')

    const order = await Order.findOneAndUpdate(
        { _id: orderId, ...filter },
        {
            proof_of_payment_url: uploadResult.secure_url,
            status: 'pending_validation'
        },
        { new: true }
    )

    if (!order) {
        throw new NotFoundError('Order not found.')
    }

    return {
        order,
        proof_of_payment_url: uploadResult.secure_url
    }
}

// This function is used to ensure that only one status update happens for a given payment ID.
export async function updateOrderStatusConditional({ orderId, newStatus, currentStatus, paymentId }) {
    //TODO: handle refund case.
    const updatedOrder = await Order.findOneAndUpdate(
        { 
            _id: orderId,
            status: currentStatus,
            payment_id: { $ne: paymentId.toString() }
        },
        { $set: { 
            status: newStatus,
            payment_id: paymentId.toString()
            } 
        },
        { new: true }
    );

    return updatedOrder;
}

// This function is used to process payment status changes from MercadoPago, 
// ensuring valid state transitions and handling side effects like stock release and email notifications.
export async function processPaymentStatusChange({ order, newStatus, paymentId, userId }) {
    const stateMachine = new OrderStateMachine(order)

    // Validate state transition
    if (!stateMachine.canTransitionTo(newStatus)) {
        console.error(`Invalid state transition from ${order.status} to ${newStatus} for order ID:`, order._id)
        throw new AppError(`Invalid state transition from ${order.status} to ${newStatus}.`, 400);
    }
    
    const updatedOrder = await updateOrderStatusConditional({ 
        orderId: order._id, 
        newStatus, 
        currentStatus: order.status, 
        paymentId 
    })
    if (!updatedOrder) {
        // This means the order was not found or it has already been updated with this payment ID (idempotency)
        console.warn(`Order with ID ${order._id} was already updated with payment ID ${paymentId}. Skipping status update.`)
        return
    }

    if (newStatus === 'payment_failed' || newStatus === 'cancelled') {
        for (const item of order.items) {
            await productService.releaseStock(item.productId, item.quantity)
        }
    }

    if (newStatus === 'paid') {
        await clearCartByUserId(userId)
        await sendOrderEmail(updatedOrder)
    }
    return updatedOrder;
}