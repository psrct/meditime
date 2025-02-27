function feedback(message) {
  return `<div style="position:absolute; text-align:center; width:100%; height=10000px; background-color:white;" id="alert-window">\
      <a style="font-size:3vw; font-weight:bold;">${message}<br>\
      <button onclick="document.getElementById('alert-window').remove(); document.getElementById('for-alert').style.visibility = 'hidden';" style="font-size:1.5vw; color:white; background-color: rgb(50, 159, 50);\
       border:none; padding-left:1%; padding-right:1%; padding-top:0.5%; padding-bottom:0.5%; border-radius:7.5%; cursor:pointer;">Back</button><a></div>`;
}

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

app.use(express.json())
app.use(express.urlencoded({ extended: true }))


// routing
app.get('/', function (req, res) {
    res.redirect('/home');
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
  let todayDate = new Date();
  todayDate.setHours(todayDate.getHours() + 7);
  todayDate = todayDate.toISOString().split('T')[0];
  res.redirect(`/queue/${todayDate}`);
});

app.post('/queue-insert', function (req, res) {
  console.log(req.body);
  if (req.body.date == null || req.body.date == undefined) {
    return res.send(feedback("Failed: Please specify date"));
  }
  if (req.body.doctor_id == null || req.body.doctor_id == undefined || req.body.doctor_id == "") {
    return res.send(feedback("Failed: Please specify doctor"));
  }
  if (req.body.start_time == null || req.body.start_time == undefined || req.body.start_time == "") {
    return res.send(feedback("Failed: Please specify start time"));
  }
  if (req.body.subtasks == null || req.body.subtasks == undefined) {
    return res.send(feedback("Failed: Some subtasks is blank"));
  }

  const doctors_sql = ` SELECT firstname FROM Doctors\
                        WHERE doctor_id = ${req.body.doctor_id} `;
  db.all(doctors_sql, (doctors_err, doctors_rows) => {
    if (doctors_err) {
      return res.send(feedback("Failed: Please specify doctor"));
    }
    if (doctors_rows == null) {
      return res.send(feedback("Failed: Please specify doctor"));
    }
  });
  const services_sql = ' SELECT * FROM Services\
                      WHERE status = "Active" ';
  db.all(services_sql, (services_err, services_rows) => {
    if (services_err) throw services_err;
    const service_id_list = services_rows.map(item => item.service_id);
    const matchingCheck = req.body.subtasks.some(value => service_id_list.includes(value));

    if (!matchingCheck) {
      return res.send(feedback("Failed: Some services are not active or exist."));
    }

    let duration = 0;
    req.body.subtasks.forEach(item => {
      const temDuration = services_rows.find(service => service.service_id === item);
      console.log(item, temDuration);
      if (temDuration == undefined) {
        return res.send(feedback("Failed: Some services are not active or exist."));
      }
      duration += temDuration.duration;
    });
    console.log(duration);

    const startDatetimeQueue = new Date(`${req.body.date} ${req.body.start_time}`);
    const endDatetimeQueue = new Date(startDatetimeQueue);

    endDatetimeQueue.setMinutes(endDatetimeQueue.getMinutes() + duration);

    console.log(startDatetimeQueue.toString());
    console.log(endDatetimeQueue.toString());

    const open_clinic_time = new Date(`${req.body.date} 09:00:00`);
    const close_clinic_time = new Date(`${req.body.date} 20:00:00`);
    console.log(open_clinic_time.toString());
    console.log(close_clinic_time.toString());

    if (!(startDatetimeQueue >= open_clinic_time && endDatetimeQueue <= close_clinic_time)) {
      return res.send(feedback("Failed: Clinic opens only 9.00 - 20.00"));
    }
  });
});

app.get('/queue/:date', function (req, res) {
  const tasks_sql = ` SELECT task_id, start_datetime, end_datetime FROM Tasks\
                      WHERE DATE(start_datetime) = "${req.params.date}" `
  const services_sql = ' SELECT * FROM Services\
                      WHERE status = "Active" AND only_doctor = "No" '
  const doctors_sql = ' SELECT d.doctor_id AS `doctor_id`, d.prename AS `prename`, d.firstname AS `firstname`, d.lastname AS `lastname`, s.name AS `specialty`, d.specialty_id AS `specialty_id` FROM Doctors d\
                      JOIN Specialties s\
                      USING (specialty_id)\
                      WHERE d.retire_date IS NULL\
                      ORDER BY specialty_id ASC; '
  const service_perms_sql = ` SELECT sp.service_id, sp.specialty_id, sp.doctor_id FROM Service_permissions sp\
                      JOIN Services s\
                      USING (service_id)\
                      WHERE s.status = "Active" AND only_doctor = "No" `
  db.all(tasks_sql, (tasks_err, tasks_rows) => {
    if (tasks_err) throw tasks_err;
    const find_task_id = `(${tasks_rows.map(item => item.task_id).join(",")})`;
    const subtasks_sql = ` SELECT task_id, subtask_no, doctor_id, service_id FROM Subtasks\
                          WHERE task_id IN ${find_task_id}\
                          ORDER BY task_id ASC, subtask_no ASC; `;
    db.all(subtasks_sql, (subtasks_err, subtasks_rows) => {
      if (subtasks_err) throw subtasks_err;
      db.all(services_sql, (services_err, services_rows) => {
        if (services_err) throw services_err;
        db.all(doctors_sql, (doctors_err, doctors_rows) => {
          if (doctors_err) throw doctors_err;
          db.all(service_perms_sql, (service_perms_err, service_perms_rows) => {
            if (service_perms_err) throw service_perms_err;
            res.render('queue', { services_data: services_rows,
                                  tasks_data: tasks_rows,
                                  subtasks_data: subtasks_rows,
                                  doctors_data: doctors_rows,
                                  service_perms_data: service_perms_rows,
                                  search_date: req.params.date
            });
          });
        });
      });
    });
  });
});

app.listen(port, () => {
    console.log(`listening to port ${port}`);
}); 