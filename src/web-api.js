const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db');

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

// Being run before each request
app.use((_req, _res, next) => {
  db = new DatabaseHelper();

  // Pass on to new handler
  next();
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, pwd } = req.body;

    updateLatest(req);

    if (await db.user.findOne({ where: { username } }))
      throw new Error('The username is already taken');

    await db.user.create({ username, email, password: pwd });

    return res.status(204).send();
  } catch (err) {
    return handleError(err, res);
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await db.user.findOne({ where: { username } })
      
    if (!user)
      throw new Error('The username is already taken');

    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(400).send({ error: 'That did not work. Try again.' });

    // cut out the password
    return res.send({ userId: user.id, username: user.username, email: user.email });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.get('/public', async (req, res) => {
  try {
    const { numMessages = 50 } = req.body;

    const messages = await db.messages.findAll({
      where: { flagged: false },
      order: [['createdAt', 'DESC']],
      limit: numMessages,
      include: [db.user]
    });

    return res.send(messages.map(msg =>
      {
        return {
          text: msg.text,
          pubDate: msg.createdAt,
          userId: msg.user.id,
          username: msg.user.username,
          email: msg.user.email
        }
      }
    ));
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

    const user = await db.user.findByPk(userId);

    const messages = await user.getMessages({
      where: { flagged: false },
      limit: numMessages,
      order: [['createdAt', 'DESC']]
    });

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
