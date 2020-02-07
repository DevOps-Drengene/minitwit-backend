let sqlite3 = require('sqlite3')
const initdb = require('./schema.js')

let db = new sqlite3.Database('/tmp/minitwit.db', (err) => {
    if (err)
        console.error(err.message)
    console.log('Connected to the minitwit database.')
});

db.exec(initdb, (_result, err) => {
    if (err)
        console.error(err.message)
    console.log('Initialized the minitwit database.')
})

db.close()