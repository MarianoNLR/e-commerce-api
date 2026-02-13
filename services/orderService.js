import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import * as productService from './productService.js';
import { getCartByUserId } from './cartService.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { BadRequestError } from '../errors/BadRequestError.js';
import mongoose from 'mongoose';

export async function getOrders({ page = 0, limit = 5 }) {
    const skip = page * limit;
    const orders = await Order.find()
        .populate('user', '-password')
        .populate('products.product')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    const totalOrders = await Order.countDocuments();
    const hasMore = skip + orders.length < totalOrders;

    return { orders, hasMore, currentPage: page, totalOrders };
}

export async function getOrderById(orderId) {
    const order = await Order.findById(orderId)
        .populate('user', '-password')
        .populate('products.product');
    
    if (order) {
        return { order };
    } else {
        throw new NotFoundError('Order not found.');
    }
}

export async function updateOrderStatus({ orderId, status }) {
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!order) {
        throw new NotFoundError('Order not found.'); 
    }
    return { order };
}

export async function payWithMercadoPago({ orderId, status, paymentId }) {
    const order = await Order.findByIdAndUpdate(orderId, { status, payment_id: paymentId }, { new: true });
    if (!order) {
        throw new NotFoundError('Order not found.');  
    }

    // TODO: transactional stock update, if one fails, rollback order status update
    for (let i = 0; i < order.items.length; i++) {
        console.log(order.items[i].productId, order.items[i].quantity)
        if (!await productService.decreaseStock(order.items[i].productId, order.items[i].quantity)) {
            console.error('Error updating product stock.')
            return
        }
    }
    return { order };
}

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
    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        // recalculate total price
        const total = cartUser.items.reduce((total, item) => {
            return total + item.product.price * item.quantity;
        }, 0);

        for (const item of cartUser.items) {
            console.log('Decreasing stock for product: ', item.product._id, ' quantity: ', item.quantity)
            const updated = await Product.findOneAndUpdate(
                { _id: item.product._id, stock: 
                    { $gte: item.quantity } 
                },
                { $inc: { stock: -item.quantity } },
                { new: true, session }
            );

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

        await newOrder.save({ session });

        await session.commitTransaction();
        session.endSession();

        console.log('New Order Created: ', newOrder)
        return { newOrder };

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
}