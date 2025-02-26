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

  //แสดงรายการแต่ละบริการ
app.get('/showservices/:id', function(req, res){
  const userId = req.params.id;
  console.log(userId);
    db.get('SELECT * FROM Service WHERE service_id = ?', [userId], (err, row) => {
      if (err || !row) {
        return res.status(404).send('User not found.');
      }
      res.render('edit-service', { data: row });
    });
});

  //แก้ไขข้อมูลบริการ
app.post('/edit-service', function (req, res) {
  console.log('Received Data:', req.body);
  const updateData = {
    serviceID: req.body.id,
    serviceName: req.body.serviceName,
    serviceCategory: req.body.serviceCategory,
    price: req.body.price,
    serviceDuration: req.body.serviceDuration,
    serviceStatus: req.body.serviceStatus
  };
  console.log(updateData);
  const sql = `UPDATE Service SET name = ?, category_id = ?, price = ?, duration = ?, status = ? WHERE service_id = ?`;
  db.run(sql, [
    updateData.serviceName,
    updateData.serviceCategory,
    updateData.price,
    updateData.serviceDuration,
    updateData.serviceStatus,
    updateData.serviceID
  ], (err) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Error Update data');
    }
    res.redirect('/showservices');
  });
});

  //ลบบริการ
app.get('/deleteservice/:id', (req, res) => {
  // req.params.id --> processes --> respond  res.*
  let id = req.params.id;
  const query = `DELETE FROM Service WHERE service_id='${id}'; `;
  db.run(query, function (err) {
      if (err) {
          return console.error(err.message);
      }
      console.log(`A Service deleted.`);
      res.redirect('/showservices');
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});