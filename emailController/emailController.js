import nodemailer from 'nodemailer'
import fs from 'fs'
import mjml2html from 'mjml'
import Handlebars from 'handlebars'
import dotenv from 'dotenv'

dotenv.config()

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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_APP_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

const templatePath = './emailController/templates/orderEmail.mjml'
const mjmlTemplate = fs.readFileSync(templatePath, 'utf-8')
const { html: htmlTemplate } = mjml2html(mjmlTemplate)

const template = Handlebars.compile(htmlTemplate)

Handlebars.registerHelper('multiply', function (a, b) {
  return a * b
})

export async function sendOrderEmail (order) {
  try {
    console.log('Preparing to send email for order: ', order)
    const html = template(order.toObject())
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: order.shipping_info.email,
      subject: 'Detalles de tu Pedido',
      html
    }
    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent: ' + info.response)
  } catch (error) {
    console.error('Error sending email: ', error)
  }
}
