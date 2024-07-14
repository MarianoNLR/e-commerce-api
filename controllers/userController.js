import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import 'dotenv/config'

const { JWT_SECRET } = process.env

export async function login (req, res) {
    //TODO Login
}

export async function register (req, res) {
    //TODO Register
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