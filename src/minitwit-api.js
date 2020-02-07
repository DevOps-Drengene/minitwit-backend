const express = require('express')

const app = express()
const port = process.env.PORT || 5001

let LATEST = 0

let updateLatest = req => LATEST = req.args.latest ? req.args.latest : LATEST

app.get('/latest', (_req, res) => {
    return res.status(200).send({ latest: LATEST })
})

app.post('/register', (req, res) => {
    
})

app.get('/msgs', (req, res) => {

})

app.get('/msgs/:username', (req, res) => {

})

app.post('/msgs/:username', (req, res) => {

})

app.get('/fllws/:username', (req, res) => {

})

app.post('/fllws/:username', (req, res) => {

})

app.listen(port, () => {
    console.log(`Server started on port: ${port}`)
})
