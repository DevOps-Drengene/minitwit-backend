module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define('user', {
        user_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false 
        },
        username: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        email: {
            type: Sequelize.STRING,
            allowNull: false
        },
        pw_hash: {
            type: Sequelize.STRING,
            allowNull: false
        }
    });
    return User;
}