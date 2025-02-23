// index.js
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});


// static resourse
app.use(express.static('public'));
// Set EJS as templating engine
app.set('view engine', 'ejs');


// routing
app.get('/', function (req, res) {
    res.redirect('/home')
});

app.get('/home', function (req, res) {
    const sql = ' SELECT s.status AS `status`, s.name AS `service_name`, c.name AS `category_name`, s.duration AS `duration`, s.price AS `price` FROM Services s\
                 JOIN Service_categories c USING (category_id)\
                 ORDER BY s.service_id ASC';

    db.all(sql, [], (err, rows) => {
        if (err) throw err;
        res.render('service_table', { data: rows });
        res.end();
    });
});

app.get('/doctor_home', function (req, res) {
  const patients_sql = ` SELECT * FROM Tasks \
                        WHERE doctor_id = ${req.query.id}\
                        ORDER BY start_datetime ASC; `;

  db.all(patients_sql, [], (tasks_err, tasks_rows) => {
    if (tasks_err) throw tasks_err;
        res.render('doctor_home', { tasks_data: tasks_rows });
    });
});

app.get('/doctor_appointment', function (req, res) {
    const patients_sql = ' SELECT patient_id AS `id`, CONCAT(prename, " ", firstname, " ", lastname) AS `name` FROM Patients \
                          ORDER BY patient_id ASC; ';

    db.all(patients_sql, [], (patients_err, patients_rows) => {
      if (patients_err) throw patients_err;
      const rooms_sql = ' SELECT room_id AS `id`, name AS `name` FROM Rooms \
                          ORDER BY room_id ASC; ';

      db.all(rooms_sql, [], (rooms_err, rooms_rows) => {
        if (rooms_err) throw rooms_err;
          res.render('doctor_appointment', { patients_data: patients_rows, rooms_data: rooms_rows });
      });
  });
});

app.get('/queue', function (req, res) {
  const tasks_sql = ' SELECT * FROM Tasks\
                      WHERE is_completed = "No" OR is_completed = "Waiting"'
  const services_sql = ' SELECT * FROM Services\
                      WHERE status = "Active" '
  db.all(tasks_sql, [], (tasks_err, tasks_rows) => {
    if (tasks_err) throw tasks_err;
    db.all(services_sql, [], (services_err, services_rows) => {
      if (services_err) throw services_err;
      res.render('queue', { services_data: services_rows, tasks_data: tasks_rows });
    });
  });
});

app.listen(port, () => {
    console.log(`listening to port ${port}`);
}); 