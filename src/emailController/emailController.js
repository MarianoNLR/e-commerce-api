import MailComposer from 'nodemailer/lib/mail-composer/index.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mjml2html from 'mjml'
import Handlebars from 'handlebars'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// const order = {
//   shipping_info: {
//     name: 'Pepe',
//     lastName: 'Pérez',
//     email: 'juan.perez@example.com',
//     phone: '123456789',
//     state: 'Chaco',
//     city: 'Resistencia',
//     address: 'Av. 9 de Julio 1234',
//     zip: '1234',
//     observations: 'holiii'
//   },
//   user: {
//     username: 'test',
//     role: 'admin',
//     id: '66982d3250cff5bebb00085b'
//   },
//   products: [
//     {
//       product: {
//         name: 'asd',
//         price: 1,
//         quantity: 1,
//         imageURL: 'png-transparent-tommy-oliver-rita-repulsa-power-rangers-zord-dragon-power-rangers-jungle-fury-dragon-fictional-character-cartoon-1757718915996.png',
//         categoryId: '66b66b539e3fbf5f57bac110',
//         description: 'asd',
//         id: '68c4a9849b6d93ccf6fed4ea'
//       },
//       quantity: 1,
//       _id: '690bbc77804650ddf4d90bc8'
//     }
//   ],
//   total: 1,
//   status: 'paid',
//   createdAt: '2025-11-05T21:07:14.645Z',
//   updatedAt: '2025-11-05T21:07:34.927Z',
//   payment_id: '132638808078',
//   id: '690bbc82804650ddf4d90bd5'
// }

// Render (plan gratuito) bloquea los puertos SMTP, así que enviamos con la API HTTP de Gmail
async function getAccessToken () {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  })
  if (!res.ok) throw new Error(`OAuth ${res.status}: ${await res.text()}`)
  return (await res.json()).access_token
}

async function sendWithGmailApi (mailOptions) {
  const raw = await new MailComposer(mailOptions).compile().build()
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: raw.toString('base64url') })
  })
  if (!res.ok) throw new Error(`Gmail API ${res.status}: ${await res.text()}`)
  return res.json()
}

const templatePath = path.join(__dirname, 'templates', 'orderEmail.mjml')
const mjmlTemplate = fs.readFileSync(templatePath, 'utf-8')
const { html: htmlTemplate } = mjml2html(mjmlTemplate)

const template = Handlebars.compile(htmlTemplate)

Handlebars.registerHelper('multiply', function (a, b) {
  return a * b
})

export async function sendOrderEmail (order) {
  try {
    console.log('Preparing to send email for order: ', order.toObject())
    const html = template(order.toObject())
    const mailOptions = {
      from: process.env.GMAIL_APP_EMAIL,
      to: order.shipping_info.email,
      subject: 'Detalles de tu Pedido',
      html
    }
    const info = await sendWithGmailApi(mailOptions)
    console.log('Email sent: ' + info.id)
  } catch (error) {
    console.error('Error sending email: ', error)
  }
}
