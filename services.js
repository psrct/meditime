const express = require("express");
const path = require("path");
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 3000;

// Middleware: ให้ Express อ่าน req.body ได้
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// เชื่อมต่อฐานข้อมูล SQLite
let db = new sqlite3.Database('database.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the SQlite database.');
});

app.set('view engine', 'ejs');

// แสดงบริการทั้งหมด
app.get('/showservices', function (req, res) {
  const sql = `
    SELECT s.*, sc.name AS category_name
    FROM Service s
    JOIN Service_categories sc
    ON s.category_id = sc.category_id
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Error fetching data');
    }
    res.render('services', { data: rows });
  });
});

// เพิ่มบริการใหม่
app.post('/add-service', function (req, res) {
  console.log('Received Data:', req.body);
  const addData = {
    serviceID: req.body.serviceID,
    serviceName: req.body.serviceName,
    serviceCategory: req.body.serviceCategory,
    price: req.body.price,
    serviceDuration: req.body.serviceDuration,
    serviceStatus: req.body.serviceStatus
  };

  const sql = `INSERT INTO Service (service_id, name, category_id, price, duration, status) 
               VALUES (?, ?, ?, ?, ?, ?)`;

  db.run(sql, [
    addData.serviceID,
    addData.serviceName,
    addData.serviceCategory,
    addData.price,
    addData.serviceDuration,
    addData.serviceStatus
  ], (err) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Error inserting data');
    }
    res.redirect('/showservices');
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});