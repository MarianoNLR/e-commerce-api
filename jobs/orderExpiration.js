import mongoose from "mongoose";
import Product from "../models/Product.js";

export function startOrderExpiration() {
    setInterval(async () => {
        try {
            await expirePendingOrders()
        } catch (error) {
            console.error('Error expiring orders:', error)
        }
    }, 5 * 60 * 1000)
}

export async function expirePendingOrders() {
    const session = await mongoose.startSession()
    try {
        session.startTransaction()
        const expiredOrders = await Order.find({
            status: 'pending_payment',
            expires_at: { $lte: new Date() }
        }).session(session)

        for (const order of expiredOrders) {
            const updatedOrder = await Order.findOneAndUpdate(
                { 
                    _id: order._id, 
                    status: 'pending_payment' 
                },
                { $set: { status: 'expired' } },
                { new: true, session }
            )

            if (!updatedOrder) continue
            for (const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.productId,
                    { $inc: { quantity: item.quantity } },
                    { session }
                )
            }

            await session.commitTransaction()

        }
    } catch (error) {
        await session.abortTransaction()
        console.error('Error expiring orders:', error)
        throw error
    } finally {
        session.endSession()
    }
}