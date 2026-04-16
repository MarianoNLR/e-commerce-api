import app from './index.js'
import { connectDB } from './mongo.js'
import { startOrderExpiration } from './jobs/orderExpiration.js'
import { startReconciliationPayments } from './jobs/reconcilePayments.js'

const PORT = process.env.PORT ?? 3000
// const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ecommerce'

// Connect to MongoDB using the URI from environment variables
await connectDB()

// Start the order expiration job
startOrderExpiration()

//Start the reconciliation payments job
startReconciliationPayments()

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`)
})