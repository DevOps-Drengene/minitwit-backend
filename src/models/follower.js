module.exports = (sequelize, Sequelize) => {
    const Follower = sequelize.define('follower', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        who_id: {
            type: Sequelize.INTEGER
        },
        whom_id: {
            type: Sequelize.INTEGER
        }
    });
    return Follower;
}