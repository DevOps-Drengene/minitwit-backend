module.exports = (sequelize, Sequelize) => {
    const Message = sequelize.define('message', {
        text: {
            type: Sequelize.STRING,
            allowNull: false
        },
        flagged: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            default: false
        }
    });
    return Message;
}