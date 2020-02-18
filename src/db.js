const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.PSQL_DB_NAME, process.env.PSQL_DB_USER_NAME, process.env.PSQL_DB_USER_PASSWORD, {
  host: process.env.PSQL_HOST_NAME || 'localhost',
  dialect: 'postgres',
  pool: { max: 30 },
  logging: false
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.user = require('./models/user.js')(sequelize, Sequelize);
db.message = require('./models/message.js')(sequelize, Sequelize);
db.follower = require('./models/follower.js')(sequelize, Sequelize);

db.user.hasMany(db.message);
db.user.hasMany(db.follower);
db.message.belongsTo(db.user, { foreignKey: 'author_id' });
db.follower.belongsTo(db.user, { foreignKey: 'whom_id' });

module.exports = {
  db,
  sequelize
};
