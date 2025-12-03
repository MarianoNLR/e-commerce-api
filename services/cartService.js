import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import 'dotenv/config'

export async function addItemToCart (userId, productId, quantity) {
    if (!productId) {
        throw { status: 400, message: 'Product ID is required' }
    }

    if (!quantity || quantity <= 0) {
        throw { status: 400, message: 'Quantity must be greater than zero' }
    }

    const product = await Product.findById(productId)
    if (!product) {
        throw { status: 404, message: 'Product not found' }
    }

    let userCart = await Cart.findOne({ user: userId })
    // If user has no cart, create one
    if (!userCart) {
        const newCart = await createCartForUser(userId)
        userCart = newCart
        console.log('Created a new cart for user:', userId)
    }

    // Control if item already exists
    const itemExistsIndex = userCart.items.findIndex(item => item.product.toString() === productId)
    // If index is -1 item does not exist in cart
    if (itemExistsIndex === -1) {
        userCart.items.push({ product: productId, quantity })
    } else {
        // Change for new quantity
        userCart.items[itemExistsIndex].quantity = quantity
    }
    let newTotalPrice = await calculateTotalPrice(userCart)
    userCart.totalPrice = newTotalPrice
    await userCart.save()
    const updatedCart = await Cart.findOne({ user: userId }).populate('items.product')

    return updatedCart
}

export async function createCartForUser(userId) {
    const newCart = new Cart({ user: userId, items: [], totalPrice: 0 })
    return await newCart.save()
}

async function calculateTotalPrice(cart) {
    let totalPrice = 0
    for (let i = 0; i < cart.items.length; i++) {
        const item = await Product.findById(cart.items[i].product)
        totalPrice += item.price * cart.items[i].quantity
    }
    return totalPrice
}

export async function getCartByUserId(userId) {
    const [cart] = await Cart.find({ user: userId }).populate('items.product')
    return cart
}

export async function deleteItemFromCart(userId, productId) {
    const [cart] = await Cart.find({ user: userId }).populate('items.product')
    let totalPrice = cart.totalPrice
    for (let i = 0; i < cart.items.length; i++) {
        const item = cart.items[i]
        if (item.product._id.toString() === productId) {
            cart.items.splice(i, 1)
            break
        }
    }
    cart.totalPrice = await calculateTotalPrice(cart)
    await Cart.findOneAndUpdate({ user: userId }, { items: cart.items, totalPrice: cart.totalPrice }, {
        new: true
    })
    const [updatedCart] = await Cart.find({ user: userId }).populate('items.product')
    return updatedCart
}