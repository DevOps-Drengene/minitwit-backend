const express = require('express')
const sqlite3 = require('sqlite3')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

const port = process.env.PORT || 5001

let LATEST = 0

let db;

// Being run before each request
app.use((_req, _res, next) => {
  db = new sqlite3.Database('/tmp/minitwit.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err)
      console.error(err.message)
  })

  // Pass on to new handler
  next()
})

let updateLatest = req => LATEST = parseInt(req.query.latest) || LATEST

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
        reject('no user found by the given name')
      }
    )
  })
}

let notReqFromSimulator = request => {
  let token = request.header('Authorization')
  if (token !== 'Basic c2ltdWxhdG9yOnN1cGVyX3NhZmUh')
    throw new Error('You are not authorized to use this resource')
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

  let usernameExists = false
  try {
    await getUserId(username)
    usernameExists = true
  } catch(err) {}
  
  let error;
  if (!username)
    error = 'You have to enter a username'
  else if (!email || !email.includes('@'))
    error = 'You have to enter a valid email address'
  else if (!pwd)
    error = 'You have to enter a password'
  else if (usernameExists)
    error = 'The username is already taken'
  else {
    db.run(
      `
        INSERT INTO user (username, email, pw_hash)
        VALUES (?, ?, ?)
      `, [
        username,
        email,
        generatePasswordHash(pwd)
      ]
    )
  }

  if (error)
    res.status(400).send({ error_msg: error, status: 400 });
  else 
    res.status(204).send();
})

app.get('/msgs', async (req, res) => {
  try {
    updateLatest(req);

    let noMsgs = req.body.no || 100
  
    let result = await new Promise((resolve, reject) => {
      db.all(
        `
          SELECT message.text as content, user.username as user, message.pub_date
          FROM message, user
          WHERE message.flagged = 0 AND message.author_id = user.user_id
          ORDER BY message.pub_date DESC LIMIT ?
        `,
        [noMsgs],
        (err, rows) => {
          if (err)
            reject(err.message)
          resolve(rows)
        })
    })
    res.send(result)
  } catch (err) {
    res.status(400).send(err.message)
  }
})

app.get('/msgs/:username', async (req, res) => {
  try {
    updateLatest(req);

    let noMsgs = req.body.no || 100

    let userId = await getUserId(req.params.username)

    let result = await new Promise((resolve, reject) => {
      db.all(
        `
          SELECT message.text as content, user.username as user, message.pub_date
          FROM message, user
          WHERE message.flagged = 0 AND
          user.user_id = message.author_id AND user.user_id = ?
          ORDER BY message.pub_date DESC LIMIT ?
        `,
        [userId, noMsgs],
        (err, rows) => {
          if (err)
            reject(err.message)
          resolve(rows)
        }
      )
    })
    res.send(result)
  } catch (err) {
    res.status(404).send(err.message)
  }
})

app.post('/msgs/:username', async (req, res) => {
  try {
    updateLatest(req)

    let userId = await getUserId(req.params.username)

    db.run(
      `
        INSERT INTO message (author_id, text, pub_date, flagged)
        VALUES (?, ?, ?, 0)
      `, [
        userId,
        req.body.content,
        Date.now()
      ]
    )
    res.status(204).send()
  } catch (err) {
    res.status(404).send()
  }
})

app.get('/fllws/:username', async (req, res) => {
  try {
    updateLatest(req)
  
    notReqFromSimulator(req)

    let userId = await getUserId(req.params.username)

    let noFollowers = req.body.no || 100
  
    let result = await new Promise((resolve, reject) => {
      db.all(
        `
          SELECT user.username FROM user
          INNER JOIN follower ON follower.whom_id=user.user_id
          WHERE follower.who_id=?
          LIMIT ?
        `,
        [userId, noFollowers],
        (err, rows) => {
          if (err)
            reject(err.message)
          resolve(rows)
        })
      })
    res.send({ follows: result.map(user => user.username) })
  } catch(err) {
    res.status(404).send(err.message)
  }
})

app.post('/fllws/:username', async (req, res) => {
  try {
    updateLatest(req)

    notReqFromSimulator(req)

    let userId = await getUserId(req.params.username)

    if (req.body.follow) {
      let followUserId = await getUserId(req.body.follow)

      db.run(
        `INSERT INTO follower (who_id, whom_id) VALUES (?, ?)`,
        [userId, followUserId]
      )
      res.status(204).send()
    }
    else if (req.body.unfollow) {
      let unfollowUserId = await getUserId(req.body.unfollow)

      db.run(
        `DELETE FROM follower WHERE who_id=? and WHOM_ID=?`,
        [userId, unfollowUserId]
      )
      res.status(204).send()
    }
  } catch (err){
    res.status(404).send()
  }
})
    
app.listen(port, () => {
  console.log(`Server started on port: ${port}`)
})
