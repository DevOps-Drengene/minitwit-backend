const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const DatabaseHelper = require('./helpers/db');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = process.env.PORT || 5001;

let latest = 0;

let db;

// Being run before each request
app.use((_req, _res, next) => {
  db = new DatabaseHelper();

  next();
});

function updateLatest(req) {
  if (req.query.latest) {
    latest = parseInt(req.query.latest, 10);
    console.log(`latest updated. now = ${latest}`);
  }
}

async function getUserId(username, canBeNull = false) {
  const result = await db.get('SELECT user_id as userId FROM user WHERE username = ?', [username]);
  if (!result && !canBeNull) {
    throw new Error('User not found');
  }

  if (result) {
    return result.userId;
  }

  return null;
}

function handleError(err, res) {
  if (err.message === 'User not found') {
    res.status(404).send({ error: err.message });
    console.error(`${err.name}: ${err.message} --> sent 404`);
  } else {
    res.status(500).send({ error: err.message });
    console.error(`${err.name}: ${err.message} --> sent 500`);
  }
}

function notReqFromSimulator(req, res) {
  const token = req.header('Authorization');
  if (token !== 'Basic c2ltdWxhdG9yOnN1cGVyX3NhZmUh') {
    res.status(403).send({ error_msg: 'You are not authorized to use this resource' });
    throw new Error('You are not authorized to use this resource');
  }
}

app.get('/latest', (req, res) => res.send({ latest }));

app.post('/register', async (req, res) => {
  try {
    const { username, email, pwd } = req.body;

    updateLatest(req);

    const userId = await getUserId(username, true);

    let error;
    if (!username) error = 'You have to enter a username';
    else if (!email || !email.includes('@')) error = 'You have to enter a valid email address';
    else if (!pwd) error = 'You have to enter a password';
    else if (userId) error = 'The username is already taken';

    if (error) {
      return res.status(400).send({ error });
    }

    const hash = await bcrypt.hash(pwd, 10);
    await db.run(
      `
        INSERT INTO user (username, email, pw_hash)
        VALUES (?, ?, ?)
      `,
      [username, email, hash],
    );

    return res.status(204).send();
  } catch (err) {
    return handleError(err, res);
  }
});

app.get('/msgs', async (req, res) => {
  try {
    updateLatest(req);

    const { no: noMsgs = 100 } = req.query;

    const messages = await db.all(
      `
        SELECT message.text as content, user.username as user, message.pub_date
        FROM message, user
        WHERE message.flagged = 0 AND message.author_id = user.user_id
        ORDER BY message.pub_date DESC LIMIT ?
      `,
      [noMsgs],
    );

    return res.send(messages);
  } catch (err) {
    return handleError(err, res);
  }
});

app.get('/msgs/:username', async (req, res) => {
  try {
    updateLatest(req);

    const { no: noMsgs = 100 } = req.query;

    const userId = await getUserId(req.params.username);

    const messages = await db.all(
      `
        SELECT message.text as content, user.username as user, message.pub_date
        FROM message, user
        WHERE message.flagged = 0 AND
        user.user_id = message.author_id AND user.user_id = ?
        ORDER BY message.pub_date DESC LIMIT ?
        `,
      [userId, noMsgs],
    );

    return res.send(messages);
  } catch (err) {
    return handleError(err, res);
  }
});

app.post('/msgs/:username', async (req, res) => {
  try {
    updateLatest(req);
    notReqFromSimulator(req, res);

    const userId = await getUserId(req.params.username);

    await db.run(
      `
        INSERT INTO message (author_id, text, pub_date, flagged)
        VALUES (?, ?, ?, 0)
      `, [
        userId,
        req.body.content,
        Date.now(),
      ],
    );

    return res.status(204).send();
  } catch (err) {
    return handleError(err, res);
  }
});

app.get('/fllws/:username', async (req, res) => {
  try {
    updateLatest(req);
    notReqFromSimulator(req);

    const userId = await getUserId(req.params.username);

    const { no: noFollowers = 100 } = req.body;

    const result = await db.all(
      `
        SELECT user.username FROM user
        INNER JOIN follower ON follower.whom_id=user.user_id
        WHERE follower.who_id=?
        LIMIT ?
      `,
      [userId, noFollowers],
    );

    res.send({ follows: result.map((user) => user.username) });
  } catch (err) {
    return handleError(err, res);
  }
});

app.post('/fllws/:username', async (req, res) => {
  try {
    updateLatest(req);
    notReqFromSimulator(req);

    const userId = await getUserId(req.params.username);

    const keys = Object.keys(req.body);

    if (keys.includes('follow')) {
      const followUserId = await getUserId(req.body.follow);

      await db.run(
        'INSERT INTO follower (who_id, whom_id) VALUES (?, ?)',
        [userId, followUserId],
      );

      return res.status(204).send();
    }

    if (keys.includes('unfollow')) {
      const unfollowUserId = await getUserId(req.body.unfollow);

      await db.run(
        'DELETE FROM follower WHERE who_id=? and WHOM_ID=?',
        [userId, unfollowUserId],
      );

      return res.status(204).send();
    }
  } catch (err) {
    return handleError(err, res);
  }
});

app.listen(port, () => {
  console.log(`Server started on port: ${port}`);
});
