const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./helpers/db');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const port = process.env.PORT || 5001;

async function getUserId(username) {
  try {
    return await db.get('SELECT user_id as userId FROM user WHERE username = ?', [username]);
  } catch (err) {
    throw new Error(err);
  }
}

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const usernameExists = !!(await getUserId(username));

    let error;
    if (!username) error = 'You have to enter a username';
    else if (!email || !email.includes('@')) error = 'You have to enter a valid email address';
    else if (!password) error = 'You have to enter a password';
    else if (usernameExists) error = 'The username is already taken';

    if (error) {
      return res.status(400).send({ error });
    }

    const insertQuery = `
      INSERT INTO user (username, email, pw_hash)
      VALUES (?, ?, ?)
    `;
    const hash = await bcrypt.hash(password, 10);
    await db.run(insertQuery, [username, email, hash]);

    const userId = await getUserId(username);
    return res.status(201).send(userId);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const userQuery = `
      SELECT * FROM user WHERE username = ?
    `;
    const user = await db.get(userQuery, [username]);
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }

    const match = await bcrypt.compare(password, user.pw_hash);

    if (!match) {
      return res.status(400).send({ error: 'That did not work. Try again.' });
    }

    // cut out the pw_hash
    return res.send({ userId: user.user_id, username: user.username, email: user.email });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.get('/public', async (req, res) => {
  try {
    const { numMessages = 50 } = req.body;

    const messagesQuery = `
      SELECT message.text, message.pub_date as pubDate, user.user_id as userId, user.username, user.email
      FROM message, user
      WHERE message.flagged = 0 AND message.author_id = user.user_id
      ORDER BY message.pub_date DESC LIMIT ?
    `;

    const messages = await db.all(messagesQuery, [numMessages]);
    return res.send(messages);
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.get('/timeline/:userId', async (req, res) => {
  try {
    // numMessages defaults to 50
    const { numMessages = 50 } = req.body;
    const { userId } = req.params;

    const messagesQuery = `
      SELECT message.text, message.pub_date as pubDate, user.user_id as userId, user.username, user.email
      FROM message, user
      WHERE message.flagged = 0 AND message.author_id = user.user_id AND (
        user.user_id = ? OR
        user.user_id IN (SELECT whom_id FROM follower WHERE who_id = ?))
      ORDER BY message.pub_date DESC LIMIT ?
    `;

    const messages = await db.all(messagesQuery, [userId, userId, numMessages]);
    return res.send(messages);
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.get('/user/:username/:currentUserId?', async (req, res) => {
  try {
    const { username, currentUserId } = req.params;
    const { numMessages = 50 } = req.body;

    const profileUserQuery = `
      SELECT user.user_id as userId, user.username, user.email
      FROM user WHERE username = ?
    `;

    const profileUser = await db.get(profileUserQuery, [username]);

    if (!profileUser) {
      return res.status(404).send({ error: 'User not found' });
    }

    const followQuery = `
      SELECT 1 FROM follower
      WHERE follower.who_id = ? AND follower.whom_id = ?
   `;

    const followingRes = await db.get(followQuery, [currentUserId, profileUser.userId]);
    const following = !!(followingRes);

    const messagesQuery = `
      SELECT message.author_id, message.text, message.pub_date as pubDate, user.user_id as userId, user.username, user.email
      FROM message, user
      WHERE user.user_id = message.author_id AND userID = ?
      ORDER BY message.pub_date DESC LIMIT ?
    `;

    const messages = await db.all(messagesQuery, [profileUser.userId, numMessages]);

    return res.send({ profileUser, following, messages });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.post('/:username/follow', async (req, res) => {
  try {
    const { currentUserId } = req.body;
    const { username } = req.params;

    if (!currentUserId) {
      return res.status(401).send({ error: 'currentUserId is missing' });
    }

    const { userId: whomId } = await getUserId(username);

    if (!whomId) {
      return res.status(404).send({ error: 'User not found' });
    }

    const insertQuery = 'INSERT INTO follower (who_id, whom_id) VALUES (?, ?)';
    await db.run(insertQuery, [currentUserId, whomId]);

    return res.status(204).send();
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.post('/:username/unfollow', async (req, res) => {
  try {
    const { currentUserId } = req.body;
    const { username } = req.params;

    if (!currentUserId) {
      return res.status(401).send({ error: 'currentUserId is missing' });
    }

    const { userId: whomId } = await getUserId(username);

    if (!whomId) {
      return res.status(404).send({ error: 'User not found' });
    }

    const deleteQuery = 'DELETE FROM follower WHERE who_id=? AND whom_id=?';
    await db.run(deleteQuery, [currentUserId, whomId]);

    return res.status(204).send();
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.post('/add_message', async (req, res) => {
  try {
    const { currentUserId, newMessage } = req.body;

    if (!currentUserId) {
      return res.status(401).send({ error: 'currentUserId is missing' });
    }

    const insertQuery = `
      INSERT INTO message (author_id, text, pub_date, flagged)
      VALUES (?, ?, ?, 0)
    `;

    await db.run(insertQuery, [currentUserId, newMessage, Date.now()]);

    const messagesQuery = `
      SELECT message.text, message.pub_date as pubDate, user.user_id as userId, user.username, user.email
      FROM message, user
      WHERE message.flagged = 0 AND message.author_id = user.user_id AND (
        user.user_id = ? OR
        user.user_id IN (SELECT whom_id FROM follower WHERE who_id = ?))
      ORDER BY message.pub_date DESC
    `;

    const messages = await db.all(messagesQuery, [currentUserId, currentUserId]);

    return res.status(201).send(messages);
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server started on port: ${port}`);
});
