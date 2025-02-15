const sqlite3  = require('sqlite3').verbose();
const dbName = 'database.db'

let db = new sqlite3.Database(dbName, (err) =>{
    if(err){
        console.error(err.message);
    }else{
        console.log("Connected database");
    }
})

module.exports = db;