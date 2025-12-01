import User from "../models/User.js"

export async function getUserById ({ userId }) {
    const user = await User.findById(userId)
    if (!user) {
        const err = new Error('User not found.')
        err.status = 404
        throw err
    }
    return { user }
}

export async function getAllUsers () {
    const users = await User.find({})
    return { users }
}

export async function getMe ({ userId }) {
    const user = await User.findById(userId)
    if (!user) {
        const err = new Error('User not found.')
        err.status = 404
        throw err
    }
    return { user }
}