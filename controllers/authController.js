import * as authService from '../services/authService.js'
import { UnauthorizedError } from '../errors/UnauthorizedError.js'

export async function login (req, res, next) {
  const { email, password } = req.body

  try {
    const token = await authService.login({ email, password })
    return res.status(200).json(token)
  }
  catch (error) {
    next(error)
  }
}

export async function completeGoogleSignup (req, res, next) {
  
  try {
    const { token, name, lastName } = req.body
    const result = await authService.completeGoogleSignup({ token, name, lastName })
    return res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function loginUserFromGoogle (req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('No user data found from Google.'))
  }

  const  {googleId, email } = req.user

  const result = await authService.loginUserFromGoogle({ googleId, email })
  if (!result) {
    return next(new Error('Response object is undefined.'))
  }
  const html = `
      <script>
        window.opener.postMessage(
          ${JSON.stringify(result)},
        'http://localhost:5173'
        );
        window.close();
      </script>
    `

  return res.status(200).send(html)
}

export async function register (req, res, next) {
  const { name, lastName, email, password, confirmPassword } = req.body

  try {
    const newUserToken = await authService.register({ name, lastName, email, password, confirmPassword })
    return res.status(201).json(newUserToken)
    
  } catch (error) {
    return next(error)
  }
}

export async function logout (req, res, next) {
  res.clearCookie('access_token').json({ message: 'Logout successfully.' })
}