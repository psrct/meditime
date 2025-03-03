const e = require("express");
const express = require("express");
const path = require("path");
const port = 3000;
const sqlite3 = require('sqlite3').verbose();

const app = express();

let db = new sqlite3.Database('database.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the SQlite database.');
});

app.set('view engine', 'ejs');

app.get('/showsubtask', function (req, res) {
  const query = 'SELECT * FROM Subtasks;';
  db.all(query, (err, rows) => {
    if (err) {
      console.log(err.message);
    }
    console.log(rows);
    res.render('datasubtask', { data: rows });
  });
});

// Starting the server
app.listen(port, () => {
  console.log("Server started.");
});