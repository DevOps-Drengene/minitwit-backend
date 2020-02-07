const express = require('express')
const sqlite3 = require('sqlite3')
const bodyParser = require('body-parser');

const app = express()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = process.env.PORT || 5001

let LATEST = 0

let db = new sqlite3.Database('/tmp/minitwit.db', (err) => {
  if (err) {
    console.error(err.message);
  }

  console.log('Connected to the minitwit database.');
});

let updateLatest = req => LATEST = req.body.latest ? req.body.latest : LATEST

//advanced cryptography
let generatePasswordHash = pwd => 'hashed ' + pwd

let getUserId = username => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT user.user_id FROM user WHERE username = ?`,
        [username],
        (err, row) => {
            if (err)
                reject(err.message)
            if (row)
                resolve(row.user_id) 
        })
    })
}

let notReqFromSimulator = request => {
    let token = request.header('Authorization')
    if (token !== 'Basic c2ltdWxhdG9yOnN1cGVyX3NhZmUh')
        return new Error('You are not authorized to use this resource')
    return false
}

app.get('/latest', (_req, res) => {
    return res.status(200).send({ latest: LATEST })
})

app.post('/register', async (req, res) => {
    const {
        username,
        email,
        pwd
    } = req.body
    
    updateLatest(req)
    
    let error;
    if (!username)
      error = 'You have to enter a username'
    else if (!email || !email.includes('@'))
      error = 'You have to enter a valid email address'
    else if (!pwd)
      error = 'You have to enter a password'
    else if (await getUserId(username))
      error = 'The username is already taken'
    else {
      db.run(`
        INSERT INTO user (username, email, pw_hash)
        VALUES (?, ?, ?)`, [
            username,
            email,
            generatePasswordHash(pwd)
        ])
    }

    if (error)
      res.status(400).send({ error_msg: error, status: 400 });
    else 
      res.status(204).send();
})

app.get('/msgs', async (req, res) => {
  updateLatest(req);

  let noMsgs = req.body.no ? req.body.no : 100
  
  let result = await new Promise((resolve, reject) => {
    db.all(
      `SELECT message.text as content, user.username as user, message.pub_date
       FROM message, user
       WHERE message.flagged = 0 AND message.author_id = user.user_id
       ORDER BY message.pub_date DESC LIMIT ?`,
      [noMsgs],
      (err, rows) => {
          if (err)
              reject(err.message)
          resolve(rows)
      })
  })
  res.send(result)
})

app.get('/msgs/:username', async (req, res) => {
  updateLatest(req);

  let noMsgs = req.body.no ? req.body.no : 100
  let userId

  try {
    userId = await getUserId(req.params.username)
  } catch (err) {
    res.status(404).send()
  }

  let result = await new Promise((resolve, reject) => {
    db.all(
      `SELECT message.text as content, user.username as user, message.pub_date
       FROM message, user
       WHERE message.flagged = 0 AND
       user.user_id = message.author_id AND user.user_id = ?
       ORDER BY message.pub_date DESC LIMIT ?`,
      [userId, noMsgs],
      (err, rows) => {
          if (err)
              reject(err.message)
          resolve(rows)
      })
  })
  
  res.send(result)
})

app.post('/msgs/:username', async (req, res) => {
    updateLatest(req)
    
    let userId

    try {
        userId = await getUserId(req.params.username)
    } catch (err) {
        res.status(404).send()
    }

    db.run(`
        INSERT INTO message (author_id, text, pub_date, flagged)
        VALUES (?, ?, ?, 0)`, [
            userId,
            req.body.content,
            Date.now()
        ])
    res.status(204).send()
})

app.get('/fllws/:username', (req, res) => {

})

app.post('/fllws/:username', (req, res) => {

})

app.listen(port, () => {
    console.log(`Server started on port: ${port}`)
})
