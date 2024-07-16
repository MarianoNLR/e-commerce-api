import jwt from 'jsonwebtoken'
import { parse } from 'cookie'

const { JWT_SECRET } = process.env

export const authUser = (req, res, next) => {
    const token = req.cooikes.access_token

    req.session = {user: null}

    try {
        const data = jwt.verify(token, JWT_SECRET)
        req.session.user = data
    } catch (error) {}

    console.log(req.session.user)
    next()
}