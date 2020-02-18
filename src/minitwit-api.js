const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const dbUtils = require('./db');

const db = dbUtils.db;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = process.env.PORT || 5001;

let latest = 0;

function updateLatest(req) {
  if (req.query.latest) {
    latest = parseInt(req.query.latest, 10);
  }
}

async function getUserId(username, canBeNull = false) {
  const result = await db.user.findOne({ where: { username } })
  
  if (!result && !canBeNull) {
    throw new Error('User not found');
  }

  if (result) {
    return result.dataValues.user_id;
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

    await db.user.create({ username, email, pw_hash: hash });

    return res.status(204).send();
  } catch (err) {
    return handleError(err, res);
  }
});

app.get('/msgs', async (req, res) => {
  try {
    updateLatest(req);

    const { no: noMsgs = 100 } = req.query;

    const messages = await db.message.findAll({
      include: [db.user],
      where: {
        flagged: 0
      },
      attributes: ['text', 'pub_date'],
      order: [['pub_date', 'DESC']],
      limit: noMsgs
    }).then(
      res => res.map(msg => {
        return {
          content: msg.text,
          pub_date: msg.pub_date,
          user: msg.user.username
        };
      })
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

    const messages = await db.message.findAll({
      include: [db.user],
      where: {
        flagged: 0,
        author_id: userId
      },
      attributes: ['text', 'pub_date'],
      order: [['pub_date', 'DESC']],
      limit: noMsgs
    }).then(
      res => res.map(msg => {
        return {
          content: msg.text,
          pub_date: msg.pub_date,
          user: msg.user.username
        };
      })
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

    await db.message.create({
      author_id: userId,
      text: req.body.content,
      pub_date: Date.now(),
      flagged: 0
    });

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

    const follows = await db.follower.findAll({
      include: [db.user],
      where: {
        who_id: userId
      },
      attributes: ['whom_id']
    });

    res.send({ follows: follows.map((flw) => flw.user.username) });
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

      await db.follower.create({ who_id: userId, whom_id: followUserId });

      return res.status(204).send();
    }

    if (keys.includes('unfollow')) {
      const unfollowUserId = await getUserId(req.body.unfollow);

      await db.follower.destroy({
        where: { who_id: userId, whom_id: unfollowUserId }
      });

      return res.status(204).send();
    }
  } catch (err) {
    return handleError(err, res);
  }
});

// It will wipe the database upon each startup
dbUtils.sequelize.sync({ force: true }).then(async () => {
  app.listen(port, () => {
    console.log(`Server started on port: ${port}`);
  });
});
