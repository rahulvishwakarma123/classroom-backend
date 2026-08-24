import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = 8000

app.use(express.json())

app.get('/',  (req, res) =>{
    res.send('Hello, Welcome to classroom API.')
})

app.listen(PORT, () =>{
    console.log(`app is running at http://localhost:${PORT}`)
})