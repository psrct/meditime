const sqlite3  = require('sqlite3').verbose();
const dbName = 'usersdatabase.db'

let db = new sqlite3.Database(dbName, (err) =>{
    if(err){
        console.error(err.message);
    }else{
        console.log("Connected database");
        db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, passpword TEXT)', (err)=>{
            if(err){
                console.log(err.message);
            }else{
                console.log("Table created or existed");
            }
        })
    }
})

module.exports = db;