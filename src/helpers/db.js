const sqlite3 = require('sqlite3');

class DatabaseHelper {
  constructor() {
    this.db = new sqlite3.Database('/tmp/minitwit.db', (err) => {
      if (err) {
        console.error(err.message);
      }
      console.log('Connected to the minitwit database.');
    });
  }

  get(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        }

        resolve(rows);
      });
    });
  }

  all(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        }

        resolve(rows);
      });
    });
  }

  run(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        }

        resolve(rows);
      });
    });
  }
}

module.exports = DatabaseHelper;
