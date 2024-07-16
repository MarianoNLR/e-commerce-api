import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import cookieParser from 'cookie-parser'
import 'dotenv/config'

const { JWT_SECRET } = process.env

export async function login (req, res) {
    const { username, password } = req.body

    try {
        const user = await User.findOne({ username })

        if (!user) {
            return res.status(401).json({message: 'Username or password incorrect.'})
        }

        const passwordMatch = await bcrypt.compare(password, user.password)

        if (!passwordMatch) {
            return res.status(401).json({message: 'Username or password incorrect.'})
        }

        const token = jwt.sign({userId: user._id, username: user.username, password: user.password}, JWT_SECRET)

        res.cookie('access_token', token, {
            httpOnlu: true,
            secure: false
        })

        return res.status(200).json({ user, token })
    } catch (error) {
        return res.status(500).json({error})
    }
}

export async function register (req, res) {
    const {username, password, confirmPassword} = req.body

    try {
        const userExists = await User.findOne({ username })

        if (userExists) return res.status(401).json({ message: 'Username already existes.' })
        
            const hashedPassword = await bcrypt.hash(password, 10)
            const newUser = new User({ username: username, password: hashedPassword })

            await newUser.save()

            return res.json({username, password: hashedPassword})
    } catch (error) {
        res.status(500).send(error)
    }
}

export async function logout (req, res) {
    res.clearCookie('access_token').json({ message: 'Logout successfully.'})
}

export async function getUser (req, res) {
    //TODO get user's data who send the request
}

export async function getAllUsers (req, res) {
    //TODO get all users in db
}