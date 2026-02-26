import User from "../models/User.js"
import { NotFoundError } from "../errors/NotFoundError.js"

export async function getUserById ({ userId }) {
    const user = await User.findById(userId)
    if (!user) {
        throw new NotFoundError('User not found.')
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
        throw new NotFoundError('User not found.')
    }
    return { user }
}