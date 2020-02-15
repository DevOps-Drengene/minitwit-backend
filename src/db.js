const Sequelize = require('sequelize');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: '/tmp/minitwit.db',
    define: {
        timestamps: false,
        freezeTableName: true
    }
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

sequelize.sync();

module.exports = db;