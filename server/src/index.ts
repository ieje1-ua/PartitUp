import express from 'express'
import cors from 'cors'
import { omrRouter } from './routes/omr.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api', omrRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`PartitUp OMR Server running on port ${PORT}`)
})
