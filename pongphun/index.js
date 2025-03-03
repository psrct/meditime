// Extend Functions
function DateToDateString(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth()+1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function DateToTimeString(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function feedback(message) {
  return `<div style="position:absolute; text-align:center; width:100%; height=10000px; background-color:white;" id="alert-window">\
      <a style="font-size:3vw; font-weight:bold;">${message}<br>\
      <button onclick="document.getElementById('alert-window').remove(); document.getElementById('for-alert').style.visibility = 'hidden';" style="font-size:1.5vw; color:white; background-color: rgb(50, 159, 50);\
       border:none; padding-left:1%; padding-right:1%; padding-top:0.5%; padding-bottom:0.5%; border-radius:7.5%; cursor:pointer;">Back</button><a></div>`;
}

function queueSuccess() {
  return `<div style="position:absolute; text-align:center; width:100%; height=10000px; background-color:white;" id="alert-window">\
      <a style="font-size:3vw; font-weight:bold;">คิวของคุณถูกบันทึกลงในระบบแล้ว<br>สามารถตรวจสอบได้ในการนัดหมาย<br>\
      <button onclick="location.reload();" style="font-size:1.5vw; color:white; background-color: rgb(50, 159, 50);\
       border:none; padding-left:1%; padding-right:1%; padding-top:0.5%; padding-bottom:0.5%; border-radius:7.5%; cursor:pointer;">Back</button><a></div>`;
}



// -------------------------------------------------------- //

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
  // Automatically to today date
  const todayDate = new Date();
  res.redirect(`/queue/${DateToDateString(todayDate)}`);
});

app.post('/queue-insert', function (req, res) {
  if (req.body.date == null || req.body.date == undefined) {
    return res.send(feedback("การดำเนินการล้มเหลว: โปรดเลือกวันที่ของท่าน"));
  }
  if (req.body.doctor_id == null || req.body.doctor_id == undefined || req.body.doctor_id == "") {
    return res.send(feedback("การดำเนินการล้มเหลว: โปรดเลือกหมอของท่าน"));
  }
  if (req.body.start_time == null || req.body.start_time == undefined || req.body.start_time == "") {
    return res.send(feedback("การดำเนินการล้มเหลว: โปรเลือกเวลาที่ต้องการจองคิว"));
  }
  if (req.body.subtasks == null || req.body.subtasks == undefined) {
    return res.send(feedback("การดำเนินการล้มเหลว: โปรดเลือกบริการที่ต้องการให้ครบถ้วน"));
  }

  const doctors_sql = ` SELECT firstname FROM Doctors\
                        WHERE doctor_id = ${req.body.doctor_id} `;
  
  db.all(doctors_sql, (doctors_err, doctors_rows) => {
    if (doctors_err || doctors_rows == null) {
      return res.send(feedback("การดำเนินการล้มเหลว: โปรดเลือกหมอของท่าน"));
    }
    
    const services_sql = ' SELECT * FROM Services\
                          WHERE status = "Active"\
                          AND only_doctor = "No" ';

    db.all(services_sql, (services_err, services_rows) => {
      if (services_err) throw services_err;
      const service_id_list = services_rows.map(item => item.service_id);
      const matchingCheck = req.body.subtasks.some(value => service_id_list.includes(value));
  
      if (!matchingCheck) {
        return res.send(feedback("การดำเนินการล้มเหลว: บริการบางอย่างนั้นไม่มีอยู่จริง"));
      }
  
      let startDatetimeQueue = new Date(`${req.body.date} ${req.body.start_time}:00`);
      let endDatetimeQueue = new Date(startDatetimeQueue);
  
      let insert_subtasks = [];
      req.body.subtasks.forEach(item => {
        const tem_insert_subtasks = {};
        const temService = services_rows.find(service => service.service_id === item);
        if (temService == undefined) {
          return res.send(feedback("การดำเนินการล้มเหลว: บริการบางอย่างนั้นไม่มีอยู่จริง"));
        }
        tem_insert_subtasks.service_id = temService.service_id;
        tem_insert_subtasks.service_name = temService.name;
        tem_insert_subtasks.category_id = temService.category_id;
  
        tem_insert_subtasks.start_datetime = new Date(endDatetimeQueue);
        endDatetimeQueue.setMinutes(endDatetimeQueue.getMinutes() + temService.duration); 
        tem_insert_subtasks.end_datetime = new Date(endDatetimeQueue);
  
        insert_subtasks.push(tem_insert_subtasks);
  
      });
  
      const todayDate = new Date();
      
      const open_clinic_time = new Date(`${req.body.date} 09:00:00`);
      const close_clinic_time = new Date(`${req.body.date} 20:00:00`);
      const start_break_time = new Date(`${req.body.date} 12:00:00`);
      const end_break_time = new Date(`${req.body.date} 13:00:00`);
  
      // Avoid Queue At Clinic Closed
      if (!(startDatetimeQueue >= open_clinic_time && endDatetimeQueue <= close_clinic_time)) {
        return res.send(feedback("การดำเนินการล้มเหลว: คลินิกเปิดให้บริการตั้งแต่เวลา 9:00 ถึง 20:00 น. เท่านั้น"));
      }

      // Avoid Queue At Break Time
      if (!(endDatetimeQueue <= start_break_time || startDatetimeQueue >= end_break_time)) {
        return res.send(feedback("การดำเนินการล้มเหลว: ไม่สามารถจองคิวในเวลาพักเที่ยงได้ตั้งแต่ 12:00 ถึง 13:00 น."));
      }
  
      // Avoid Queue Already Passed
      if (startDatetimeQueue < todayDate) { 
        return res.send(feedback("การดำเนินการล้มเหลว: โปรดอย่าจองคิวในอดีต"));
      }
  
      // Avoid Queue Time That Already Have Queue
      const collision_subtasks_sql = ` SELECT task_id, subtask_no, room_id, doctor_id, service_id, start_datetime, end_datetime FROM Subtasks\
                                    WHERE doctor_id = ${req.body.doctor_id}\
                                    AND DATETIME(start_datetime) < DATETIME("${DateToDateString(endDatetimeQueue)} ${DateToTimeString(endDatetimeQueue)}")\
                                    AND DATETIME(end_datetime) > DATETIME("${DateToDateString(startDatetimeQueue)} ${DateToTimeString(startDatetimeQueue)}"); `;
      
      db.all(collision_subtasks_sql, (collision_subtasks_err, collision_subtasks_rows) => {
        if (collision_subtasks_err) throw collision_subtasks_err;

        if (collision_subtasks_rows.length > 0) {
          return res.send(feedback("การดำเนินการล้มเหลว: การจองคิวของคุณมีการทับซ้อนเวลากับคิวก่อนหน้า"));
        }
  
        // Find Available Room

        let room_check_message;
        let inactive_room_sql;

        for (let i = 0; i < insert_subtasks.length; i++) {
          inactive_room_sql = ` SELECT DISTINCT r.room_id, r.name FROM Rooms r\
                            LEFT JOIN Subtasks\ s
                            ON (r.room_id = s.room_id)\
                            AND DATETIME(start_datetime) < DATETIME("${DateToDateString(endDatetimeQueue)} ${DateToTimeString(endDatetimeQueue)}")\
                            AND DATETIME(end_datetime) > DATETIME("${DateToDateString(startDatetimeQueue)} ${DateToTimeString(startDatetimeQueue)}")\
                            WHERE s.room_id IS NULL\
                            AND r.category_id = ${insert_subtasks[i].category_id}\
                            ORDER BY r.room_id ASC; `;
          
          db.all(inactive_room_sql, (inactive_room_err, inactive_room_rows) => {
            if (inactive_room_err) throw inactive_room_err;

            if (inactive_room_rows.length == 0) {
              room_check_message = `การดำเนินการล้มเหลว: ไม่มีห้องว่างสำหรับบริการ "${insert_subtasks[i].service_name}" ในเวลาดังกล่าว`;
            } else {
              insert_subtasks[i].room_id = inactive_room_rows[0].room_id;
            }
          });

          if (room_check_message) {
            break;
          }
        }

        if (room_check_message) {
          return res.send(feedback(room_check_message));
        }


        
        // Start Queue

        const patient_id = ${req.session.user.id};
        const queue_tasks_sql = ` INSERT INTO Tasks (patient_id, start_datetime, end_datetime, is_completed, is_paid) VALUES\
                                (${patient_id},\
                                "${DateToDateString(startDatetimeQueue)} ${DateToTimeString(startDatetimeQueue)}",\
                                "${DateToDateString(endDatetimeQueue)} ${DateToTimeString(endDatetimeQueue)}",\
                                "No",\
                                "No"); `;
        
        db.run(queue_tasks_sql, function(queue_tasks_err) {
          if (queue_tasks_err) throw queue_tasks_err;
    
          for (let i = 0; i < insert_subtasks.length; i++) {
            const queue_subtasks_sql = ` INSERT INTO Subtasks (task_id, subtask_no, room_id, doctor_id, service_id, start_datetime, end_datetime) VALUES\
                                      (${this.lastID},\
                                      ${i+1},\
                                      "${insert_subtasks[i].room_id}",\
                                      ${req.body.doctor_id},\
                                      "${insert_subtasks[i].service_id}",\
                                      "${DateToDateString(insert_subtasks[i].start_datetime)} ${DateToTimeString(insert_subtasks[i].start_datetime)}",\
                                      "${DateToDateString(insert_subtasks[i].end_datetime)} ${DateToTimeString(insert_subtasks[i].end_datetime)}"
                                      );`;
    
            db.run(queue_subtasks_sql, (queue_subtasks_err, queue_subtasks_rows) => {
              if (queue_subtasks_err) throw queue_subtasks_err;
            })
          };

          return res.send(queueSuccess());
        });
      });
    });
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
    const subtasks_sql = ` SELECT task_id, subtask_no, doctor_id, service_id, start_datetime, end_datetime FROM Subtasks\
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

// -------------------------------------------------------- //
