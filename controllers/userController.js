import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import cookieParser from 'cookie-parser'
import 'dotenv/config'

const { JWT_SECRET } = process.env

export async function login (req, res) {
    //TODO Login
}

export async function register (req, res) {
    const {username, password, confirmPassword} = req.body

    try {
        const userExists = User.findOne({ username })

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
    //TODO Logout
}

export async function getUser (req, res) {
    //TODO get user's data who send the request
}

export async function getAllUsers (req, res) {
    //TODO get all users in db
}