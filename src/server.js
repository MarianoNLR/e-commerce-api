import app from './index.js'
import { connectDB } from './mongo.js'
import { startOrderExpiration } from './jobs/orderExpiration.js'
import { startReconciliationPayments } from './jobs/reconcilePayments.js'
import PaymentIncident from './models/PaymentIncident.js'
import https from 'https'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config({
    path:`.env.${process.env.NODE_ENV}`
})

const PORT = process.env.PORT ?? 3000
// const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ecommerce'

// Connect to MongoDB using the URI from environment variables
await connectDB()
// Ensure payment notifications cannot create duplicate incidents, even when autoIndex is disabled.
await PaymentIncident.createIndexes()

// Start the order expiration job
startOrderExpiration()

//Start the reconciliation payments job
startReconciliationPayments()

// https.createServer({
//     key: fs.readFileSync('../certs/localhost+2-key.pem'),
//     cert: fs.readFileSync('../certs/localhost+2.pem')
// }, app).listen(PORT, () => {
//     console.log(`Server listening on https://localhost:${PORT}`)
// })

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`)
})
