import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import * as productService from './productService.js';

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
        return order;
    } else {
        const err = new Error('Order not found.');
        err.status = 404;
        throw err;
    }
}

export async function updateOrderStatus({ orderId, status }) {
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!order) {
        const err = new Error('Order not found.');
        err.status = 404;
        throw err;   
    }
    return order;
}

export async function payWithMercadoPago({ orderId, status, paymentId }) {
    const order = await Order.findByIdAndUpdate(orderId, { status, payment_id: paymentId }, { new: true });
    if (!order) {
        const err = new Error('Order not found.');
        err.status = 404;
        throw err;   
    }

    for (let i = 0; i < order.items.length; i++) {
        console.log(order.items[i].productId, order.items[i].quantity)
        if (!await productService.decreaseStock(order.items[i].productId, order.items[i].quantity)) {
            console.error('Error updating product stock.')
            return
        }
    }
    return order;
}

export async function updateOrder(orderId, updateData) {
    const order = await Order.findByIdAndUpdate(orderId, updateData, { new: true });
    if (!order) {
        const err = new Error('Order not found.');
        err.status = 404;
        throw err;   
    }
    return order;
}

export async function createOrder({ userId, shippingInfo }) {
    const [cartUser] = await Cart.find({ user: userId });
    if (!cartUser) {
        const err = new Error('Cart not found.');
        err.status = 404;
        throw err;   
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
        total: cartUser.totalPrice,
        shipping_info: shippingInfo,
    });

    await Cart.findOneAndDelete({ user: userId });

    await newOrder.save();
    
    return newOrder;
}