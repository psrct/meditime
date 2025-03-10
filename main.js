const express = require('express')
const app = express()
const port = 3000
const path = require('path');
const bcrypt = require('bcrypt');

const db = require('./database.js');
const session = require('express-session');
const { checkLoggedIn, bypasslogin, isOwner, isDoctor, isPatient } = require('./middleware.js');
const { json } = require('stream/consumers');

app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: 'my_session_secret',
  resave: true,
  saveUninitialized: false,
  name: 'user',
  cookie: {
    maxAge: 86400000,
    httpOnly: true
  }
}));

app.use((req, res, next) => {
  if (!req.session.user) {
    req.session.user = {
      isLoggedin: false
    };
  }
  res.locals.user = req.session.user;
  next();
})


// -------------------------------- LOGIN SYSTEMS --------------------------------------------------------

app.get('/login', bypasslogin, function (req, res) {
  res.render('login');
});

app.post('/login', function (req, res) {
  console.log(req.body);
  let loginData = {
    username: req.body.username,
    password: req.body.password
  }
  const sql = `select * from Patients where username = "${loginData.username}" `;
  db.all(sql, function (err, rows) {
    // console.log(rows);
    if (rows.length < 1) {
      res.send("<script>alert('ไม่พบบัญชีผู้ใช้'); window.location.href = '/login';</script> ")
    } else if (loginData.password != rows[0].password) {
      res.send("<script>alert('รหัสผ่านไม่ถูกต้อง'); window.location.href = '/login';</script> ")
    } else {
      req.session.user = {
        id: rows[0].patient_id,
        username: rows[0].username,
        usertype: "patient",
        isLoggedin: true
      }

      res.redirect("/");
    }
  });
});

app.get('/login-staff', bypasslogin, function (req, res) {
  res.render('login-staff');
});

app.post('/login-staff', function (req, res) {
  console.log(req.body);
  let loginData = {
    username: req.body.username,
    password: req.body.password
  }
  const sql = `select * from Doctors where username = "${loginData.username}" and retire_date is null `;
  if (loginData.username === "sam" && loginData.password === "samowner1234") {
    req.session.user = {
      usertype: "clinic_owner",
      isLoggedin: true
    }
    res.redirect("/showservices");
  } else {
    db.all(sql, function (err, rows) {
      // console.log(rows);
      if (rows.length < 1) {
        res.send("<script>alert('ไม่พบบัญชีผู้ใช้'); window.location.href = '/login-staff';</script> ")
      } else if (loginData.password != rows[0].password) {
        res.send("<script>alert('รหัสผ่านไม่ถูกต้อง'); window.location.href = '/login-staff';</script> ")
      } else {
        req.session.user = {
          id: rows[0].doctor_id,
          username: rows[0].username,
          specialty: rows[0].specialty_id,
          usertype: "doctor",
          isLoggedin: true
        }
        res.redirect("/schedule");
      }
    });
  }
});

app.get('/register', bypasslogin, function (req, res) {
  res.render("register");
});

app.post('/register', bypasslogin, function (req, res) {
  var cur_time = new Date();
  var time_conv = `${cur_time.getFullYear()}-` + `${cur_time.getMonth() + 1}-`.padStart(3, "0") + `${cur_time.getDate()}`.padStart(2, "0") + ` ${cur_time.getHours()}:${cur_time.getMinutes()}:${cur_time.getSeconds()}`;
  console.log(time_conv);

  console.log(req.body);
  let registerData = {
    username: req.body.username,
    password: req.body.password,
    prename: req.body.prename,
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    gender: req.body.gender,
    birth_date: req.body.birth_date
  };
  console.log(registerData);
  const sql = `insert into Patients(prename, firstname, lastname, birth_date, gender, register_datetime, username, password) 
    values("${registerData.prename}",
     "${registerData.firstname}",
     "${registerData.lastname}",
     "${registerData.birth_date}",
     "${registerData.gender}",
     "${time_conv}",
     "${registerData.username}",
     "${registerData.password}")`;
  db.run(sql, function (err) {
    if (err) throw err;
    console.log("Add user successfully.");
  });
  res.redirect('/register');
});

app.get('/logout', function (req, res) {
  req.session.destroy();
  res.clearCookie('user');
  res.redirect('/');
})


// --------------------------------  FOR ALL --------------------------------------------------------





app.get('/services', function (req, res) {
  const sql = `
    SELECT s.service_id AS 'service_id', s.name AS 'service_name', s.price AS 'price', s.duration AS 'duration', s.only_doctor AS 'only_doctor', s.status AS 'status', sc.name AS category_name
    FROM Services s
    JOIN Service_categories sc
    ON s.category_id = sc.category_id
    ORDER BY s.category_id ASC, service_id ASC;
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Error fetching data');
    }
    res.render('service_table', { data: rows });
  });
});





// --------------------------------  FOR PATIENT --------------------------------------------------------

app.get('/', function (req, res) {
  if (!req.session.user) {
    req.session.user = {
      isLoggedin: false
    };
  }
  console.log(req.session.user);
  res.redirect('/home');
});

app.get('/home', function (req, res) {
  const vaccineData = [
    { title: "วัคซีนป้องกันมะเร็งปากมดลูก 9 สายพันธุ์ (3 เข็ม)", price: "18,900 บาท", img: "https://via.placeholder.com/150" },
    { title: "วัคซีนป้องกันโรคหัด คางทูม หัดเยอรมัน (MMR)", price: "861 บาท", img: "https://via.placeholder.com/150" },
    { title: "ฉีดวัคซีนไข้หวัดใหญ่ 4 สายพันธุ์", price: "242 บาท", img: "https://via.placeholder.com/150" }
  ];
  const reviews = [
    {
      name: "A",
      image: "https://randomuser.me/api/portraits/women/1.jpg",
      comment: "เพื่อนที่ทำงานแนะนำมา...สะดวกมากค่ะ"
    },
    {
      name: "B",
      image: "https://randomuser.me/api/portraits/men/2.jpg",
      comment: "รู้จัก Meditime จากเพื่อนแนะนำมา..."
    },
    {
      name: "C",
      image: "https://randomuser.me/api/portraits/women/3.jpg",
      comment: "รู้จัก Meditime จาก Facebook..."
    },
    {
      name: "D",
      image: "https://randomuser.me/api/portraits/women/4.jpg",
      comment: "รู้จักผ่าน Facebook...และน่าเชื่อถือค่ะ"
    }
  ];
  res.render("home", { reviews, vaccines: vaccineData });
});


app.get('/profile', checkLoggedIn, isPatient, function (req, res) {
  console.log(`this is session for user ${req.session.user}`);
  const sql = `select prename, firstname, lastname, birth_date, gender, username, iden_id, contact_number, add_contact_number, medical_conditions from Patients where patient_id = ${req.session.user.id} `;
  db.all(sql, function (err, rows) {
    console.log(rows);
    res.render('profile', { data: rows });
  });
})

app.post('/profile', checkLoggedIn, isPatient, function (req, res) {
  let updateData = {
    prename: req.body.prename,
    fname: req.body.firstname,
    lname: req.body.lastname,
    birth_date: req.body.birth_date,
    gender: req.body.gender,
    iden_id: req.body.iden_id,
    connum: req.body.contact_num,
    add_connum: req.body.add_contact,
    medcon: req.body.medical_conditions
  }
  const sql = `update Patients set
    prename = "${updateData.prename}",
    firstname = "${updateData.fname}",
    lastname = "${updateData.lname}",
    gender = "${updateData.gender}",
    iden_id = "${updateData.iden_id}",
    contact_number = "${updateData.connum}",
    add_contact_number = "${updateData.add_connum}",
    medical_conditions = "${updateData.medcon}"
    where patient_id = ${req.session.user.id} `;
  db.run(sql, function (err) {
    if (err) throw err;
    res.redirect("/profile");
  });
})

app.get('/history', checkLoggedIn, isPatient, function (req, res) {
  const task_query = ` SELECT * FROM Tasks\
                      WHERE patient_id = ${req.session.user.id}; `;
  const subtask_query = `SELECT st.task_id AS 'task_id', st.subtask_no AS 'subtask_no', st.room_id AS 'room_id', r.name AS 'room_name', st.service_id AS 'service_id', \
                        sv.name AS 'service_name', st.start_datetime AS 'start_datetime', st.end_datetime AS 'end_datetime', sv.price AS 'price', sv.duration AS 'duration', sc.name AS 'category_name', \
                        d.prename || " " || d.firstname || " " || d.lastname AS 'doctor_name', DATE(st.start_datetime) AS 'date' FROM Subtasks st\
                        \
                        JOIN Tasks t\
                        USING (task_id)\
                        JOIN Services sv\
                        USING (service_id)\
                        JOIN Service_categories sc\
                        USING (category_id)\
                        JOIN Patients p\
                        USING (patient_id)\
                        JOIN Rooms r\
                        USING (room_id)\
                        JOIN Doctors d\
                        USING (doctor_id)\
                        WHERE patient_id = ${req.session.user.id}\
                        ORDER BY DATETIME(st.start_datetime) DESC, t.task_id DESC, st.subtask_no DESC; `
  db.all(task_query, (err, tasks_rows) => {
    if (err) {
      console.log(err.message);
    }

    db.all(subtask_query, (err, subtasks_rows) => {
      if (err) {
        console.log(err.message);
      }

      return res.render('data', { tasks_data: tasks_rows,
                            subtasks_data: subtasks_rows
      });
    });
  });
});

// -------------------------------------- FOR CLINIC OWNER -------------------------------------------------------


app.get('/manage-staff', checkLoggedIn, isOwner, function (req, res) {
  const sql = `select d.doctor_id, d.prename, d.firstname, d.lastname, d.gender, d.contact_number, d.specialty_id, s.name, d.hire_date, d.retire_date, d.username, d.password 
  from Doctors d join Specialties s using(specialty_id)`;
  db.all(sql, function (err, rows) {
    // console.log(JSON.stringify(rows));
    res.render('manage-staff', { data: rows });
  });
})

app.get('/edit-staff/:id', checkLoggedIn, isOwner, function (req, res) {
  const sql = `select * from Doctors where doctor_id = ${req.params.id} `;
  db.all(sql, function (err, rows) {
    console.log(rows);
    db.all("select * from Specialties", function (err, result) {
      console.log(result);
      res.render('profile-staff', { data: rows, specialtyinfo: result });
    })
  });
})

app.post('/edit-staff/:id', checkLoggedIn, isOwner, function (req, res) {
  let updateData = {
    id: req.params.id,
    // prename : req.body.prename,
    username: req.body.username,
    password: req.body.password,
    contact_number: req.body.contact_number,
    fname: req.body.firstname,
    lname: req.body.lastname,
    retire_date: req.body.retire_date,
    gender: req.body.gender,
    specialty_id: req.body.specialty_id
  }

  let prename = "";

  if (updateData.gender == "Male") {
    prename = "นายแพทย์";
  } else {
    prename = "แพทย์หญิง";
  }

  const sql = `update Doctors set
    prename = "${prename}",
    firstname = "${updateData.fname}",
    lastname = "${updateData.lname}",
    gender = "${updateData.gender}",
    specialty_id = "${updateData.specialty_id}",
    username = "${updateData.username}",  
    password = "${updateData.password}",
    contact_number = "${updateData.contact_number}"
    where doctor_id = ${updateData.id} `;
  db.run(sql, function (err) {
    if (err) throw err;
    res.redirect(`/edit-staff/${updateData.id}`);
  });
})

app.get('/add-staff', checkLoggedIn, isOwner, function (req, res) {
  const sql = `select * from Specialties`;
  db.all(sql, function (err, rows) {
    console.log(rows);
    // console.log(rows);
    res.render('add-doctor', { data: rows });
  });
})

app.post('/add-staff', checkLoggedIn, isOwner, function (req, res) {
  var cur_time = new Date();
  var time_conv = `${cur_time.getFullYear()}-` + `${cur_time.getMonth() + 1}-`.padStart(3, "0") + `${cur_time.getDate()}`.padStart(2, "0") + ` ${cur_time.getHours()}:${cur_time.getMinutes()}:${cur_time.getSeconds()}`;
  console.log(time_conv);

  console.log(req.body);
  let registerData = {
    username: req.body.username,
    password: req.body.password,
    prename: req.body.prename,
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    gender: req.body.gender,
    specialty_id: req.body.specialty,
    contact: req.body.contact
  };
  console.log(registerData);
  const sql = `insert into Doctors(prename, firstname, lastname, hire_date, retire_date, specialty_id, gender, username, password, contact_number) 
        values("${registerData.prename}",
        "${registerData.firstname}",
        "${registerData.lastname}",
        "${time_conv}",
        NULL,
        ${registerData.specialty_id},
        "${registerData.gender}",
        "${registerData.username}",
        "${registerData.password}",
        "${registerData.contact}")`;
  db.run(sql, function (err) {
    if (err) throw err;
    console.log("Add user successfully.");
  });
  res.redirect('/manage-staff');
});

app.get('/remove-staff/:id', checkLoggedIn, isOwner, function (req, res) {
  const sql = `delete from Doctors where doctor_id = ${req.params.id} `;
  db.run(sql, function (err) {
    if (err) throw err;
    res.redirect("/manage-staff");
  });
})

app.get('/showservices', checkLoggedIn, isOwner, function (req, res) {
  const sql = `
    SELECT s.*, sc.name AS category_name
    FROM Services s
    JOIN Service_categories sc
    ON s.category_id = sc.category_id
    ORDER BY s.category_id ASC, service_id ASC;
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Error fetching data');
    }
    res.render('services', { data: rows });
  });
});

app.get("/add", checkLoggedIn, isOwner, function (req, res) {
  res.render('addform')
});

// เพิ่มบริการใหม่
app.post('/add-service', checkLoggedIn, isOwner, function (req, res) {
  console.log('Received Data:', req.body);
  const addData = {
    serviceID: req.body.serviceID,
    serviceName: req.body.serviceName,
    serviceCategory: req.body.serviceCategory,
    price: req.body.price,
    serviceDuration: req.body.serviceDuration,
    serviceonlydoctor: req.body.serviceonlydoctor,
    serviceStatus: req.body.serviceStatus
  };

  const sql = `INSERT INTO Services (service_id, name, category_id, price, duration, only_doctor, status) 
                    VALUES (?, ?, ?, ?, ?,?, ?)`;

  db.run(sql, [
    addData.serviceID,
    addData.serviceName,
    addData.serviceCategory,
    addData.price,
    addData.serviceDuration,
    addData.serviceonlydoctor,
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
app.get('/showservices/:id', checkLoggedIn, isOwner, function (req, res) {
  const userId = req.params.id;
  console.log(userId);
  db.get('SELECT * FROM Services WHERE service_id = ?', [userId], (err, row) => {
    if (err || !row) {
      return res.status(404).send('Error fetch data');
    }
    res.render('edit-service', { data: row });
  });
});

//แก้ไขข้อมูลบริการ
app.post('/edit-service', checkLoggedIn, isOwner, function (req, res) {
  console.log('Received Data:', req.body);
  const updateData = {
    serviceID: req.body.id,
    serviceName: req.body.serviceName,
    serviceCategory: req.body.serviceCategory,
    price: req.body.price,
    serviceDuration: req.body.serviceDuration,
    serviceonlydoctor: req.body.serviceonlydoctor,
    serviceStatus: req.body.serviceStatus
  };
  console.log(updateData);
  const sql = `UPDATE Services SET name = ?, category_id = ?, price = ?, duration = ?, only_doctor = ?, status = ? WHERE service_id = ?`;
  db.run(sql, [
    updateData.serviceName,
    updateData.serviceCategory,
    updateData.price,
    updateData.serviceDuration,
    updateData.serviceonlydoctor,
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
app.get('/deleteservice/:id', checkLoggedIn, isOwner, (req, res) => {
  let id = req.params.id;
  const query = `DELETE FROM Services WHERE service_id='${id}'; `;
  db.run(query, function (err) {
    if (err) {
      return res.json({ success: false, message: "เกิดข้อผิดพลาดในการลบ" });
    }
    console.log(`A Service deleted.`);
    res.json({ success: true, message: "ลบรายการสำเร็จ!" });
  });
});

app.get('/records', checkLoggedIn, isOwner, function (req, res) {
  const task_query = ` SELECT * FROM Tasks; `;
  const subtask_query = `SELECT st.task_id AS 'task_id', st.subtask_no AS 'subtask_no', st.room_id AS 'room_id', r.name AS 'room_name', st.service_id AS 'service_id', \
                        sv.name AS 'service_name', st.start_datetime AS 'start_datetime', st.end_datetime AS 'end_datetime', sv.price AS 'price', sv.duration AS 'duration', sc.name AS 'category_name', \
                        d.prename || " " || d.firstname || " " || d.lastname AS 'doctor_name', DATE(st.start_datetime) AS 'date' FROM Subtasks st\
                        \
                        JOIN Tasks t\
                        USING (task_id)\
                        JOIN Services sv\
                        USING (service_id)\
                        JOIN Service_categories sc\
                        USING (category_id)\
                        JOIN Patients p\
                        USING (patient_id)\
                        JOIN Rooms r\
                        USING (room_id)\
                        JOIN Doctors d\
                        USING (doctor_id)\
                        ORDER BY DATETIME(st.start_datetime) DESC, t.task_id DESC, st.subtask_no DESC; `
  db.all(task_query, (err, tasks_rows) => {
    if (err) {
      console.log(err.message);
    }

    db.all(subtask_query, (err, subtasks_rows) => {
      if (err) {
        console.log(err.message);
      }

      return res.render('data', { tasks_data: tasks_rows,
                                  subtasks_data: subtasks_rows
      });
    });
  });
});

app.get('/records/:id', checkLoggedIn, isOwner, function (req, res) {
  const task_query = ` SELECT * FROM Tasks WHERE task_id = ${req.params.id}; `;
  const subtask_query = `SELECT st.task_id AS 'task_id', st.subtask_no AS 'subtask_no', st.room_id AS 'room_id', r.name AS 'room_name', st.service_id AS 'service_id', \
                        sv.name AS 'service_name', st.start_datetime AS 'start_datetime', st.end_datetime AS 'end_datetime', sv.price AS 'price', sv.duration AS 'duration', sc.name AS 'category_name', \
                        d.prename || " " || d.firstname || " " || d.lastname AS 'doctor_name', DATE(st.start_datetime) AS 'date' FROM Subtasks st\
                        \
                        JOIN Tasks t\
                        USING (task_id)\
                        JOIN Services sv\
                        USING (service_id)\
                        JOIN Service_categories sc\
                        USING (category_id)\
                        JOIN Patients p\
                        USING (patient_id)\
                        JOIN Rooms r\
                        USING (room_id)\
                        JOIN Doctors d\
                        USING (doctor_id)\
                        WHERE task_id = ${req.params.id}\
                        ORDER BY DATETIME(st.start_datetime) DESC, t.task_id DESC, st.subtask_no DESC; `
  db.all(task_query, (err, tasks_rows) => {
    if (err) {
      console.log(err.message);
    }

    db.all(subtask_query, (err, subtasks_rows) => {
      if (err) {
        console.log(err.message);
      }

      return res.render('data-edit', { tasks_data: tasks_rows });
    });
  });
});

app.post("/records/:id", checkLoggedIn, isOwner, function(req, res){
  const sql = ` UPDATE Tasks\
  SET is_completed = "${req.body.is_completed}",\
  is_paid = "${req.body.is_paid}"\
  WHERE task_id = ${req.params.id}; `;
  db.run(sql, function (err) {
    if (err) throw err;
    console.log(`update task_id ${req.params.id}.`);
  });
  res.redirect(`/records/${req.params.id}`);
})
// -------------------------------------- FOR DOCTOR  -------------------------------------------------------


// app.get('/home-staff', checkLoggedIn, isStaff, function(req, res){
//     res.render('home-staff');
// })


// app.get('/showdata',checkLoggedIn, isOwner || isStaff, function (req, res) {
//     const query = 'SELECT * FROM Tasks;';
//     db.all(query, (err, rows) => {
//       if (err) {
//         console.log(err.message);
//       }
//       console.log(rows);
//       res.render('data', { data: rows });
//     });
//   });

app.get('/doctor_home', checkLoggedIn, isDoctor, function (req, res) {
  const patients_sql = ` SELECT * FROM Subtasks \
                        WHERE doctor_id = ${req.session.user.id}\
                        ORDER BY start_datetime ASC; `;

  db.all(patients_sql, [], (tasks_err, tasks_rows) => {
    if (tasks_err) throw tasks_err;
    res.render('doctor_home', { tasks_data: tasks_rows });
  });
});

app.get('/doctor_history', checkLoggedIn, isDoctor, function (req, res) {
  const query = `SELECT st.task_id AS 'task_id', st.subtask_no AS 'subtask_no', p.patient_id AS 'patient_id', p.prename || " " || p.firstname || " " || p.lastname AS 'patient_name', DATE(st.end_datetime) AS 'date', \
                st.room_id AS 'room_id', r.name AS 'room_name', st.service_id AS 'service_id', sv.name AS 'service_name', st.start_datetime AS 'start_datetime', st.end_datetime AS 'end_datetime', sv.price AS 'price', sv.duration AS 'duration', sc.name AS 'category_name' FROM Subtasks st\
                \
                JOIN Tasks t\
                USING (task_id)\
                JOIN Services sv\
                USING (service_id)\
                JOIN Service_categories sc\
                USING (category_id)\
                JOIN Patients p\
                USING (patient_id)\
                JOIN Rooms r\
                USING (room_id)\
                WHERE doctor_id = ${req.session.user.id}\
                ORDER BY DATETIME(st.start_datetime) DESC, t.task_id DESC, st.subtask_no DESC; `
  db.all(query, (err, rows) => {
    if (err) {
      console.log(err.message);
    }
    console.log(rows);
    res.render('datasubtask', { data: rows });
  });
});


//---------------------------------------- QUEQE / APPOINTMENT SYSTEMS --------------------------------------------------------------


// Extend Functions
function DateToDateString(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
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
  return `${message}`;
}

function queueSuccess(req, res) {
  return `คิวของคุณถูกบันทึกลงในระบบแล้ว<br>สามารถตรวจสอบได้ในการนัดหมาย`;
}



// -------------------------------------------------------- //



app.get('/doctor_appointment', checkLoggedIn, isDoctor, function (req, res) {

  // นำไปสู่หน้านัดผู้ป่วยในวันนี้ทันที

  const todayDate = new Date();
  res.redirect(`/doctor_appointment/${DateToDateString(todayDate)}`);
});


app.get('/doctor_appointment/:date', checkLoggedIn, isDoctor, function (req, res) {


  // ป้องกันการใส่วันที่ไม่มีอยู่จริง
  if (isNaN(new Date(req.params.date))) {
    return res.redirect("/doctor_appointment");
  }


  const doctor_id = req.session.user.id;

  const doctor_sql = ` SELECT doctor_id AS 'id', CONCAT(prename, " ", firstname, " ", lastname) AS 'name', specialty_id FROM Doctors \
                      WHERE doctor_id = ${doctor_id}; `;

  db.all(doctor_sql, [], (doctor_err, doctor_rows) => {
    if (doctor_err) throw doctor_err;
    const subtasks_sql = ` SELECT st.task_id AS 'task_id', st.subtask_no AS 'subtask_no', st.doctor_id AS 'doctor_id', st.service_id AS 'service_id', st.start_datetime AS 'start_datetime', st.end_datetime AS 'end_datetime', t.patient_id AS 'patient_id'\
                          FROM (SELECT * FROM Subtasks WHERE DATE(start_datetime) = "${req.params.date}") st\
                          JOIN Tasks t\
                          USING (task_id)\
                          ORDER BY st.task_id ASC, st.subtask_no ASC; `;

    db.all(subtasks_sql, (subtasks_err, subtasks_rows) => {
      if (subtasks_err) throw subtasks_err;
      const services_sql = ` SELECT s.service_id AS 'service_id', s.name AS 'name', s.price AS 'price', s.duration AS 'duration' FROM Services s\
                            JOIN Service_permissions sp\
                            ON (s.service_id = sp.service_id)\
                            AND (doctor_id = ${doctor_id} OR specialty_id = ${doctor_rows[0].specialty_id})\
                            WHERE s.status = "Active" `;

      db.all(services_sql, (services_err, services_rows) => {
        if (services_err) throw services_err;
        const patients_sql = ' SELECT patient_id AS `patient_id`, prename AS `prename`, firstname AS `firstname`, lastname AS `lastname` FROM Patients\
                              ORDER BY patient_id ASC; '

        db.all(patients_sql, (patients_err, patients_rows) => {
          if (patients_err) throw patients_err;

          res.render('doctor_appointment', {
            services_data: services_rows,
            subtasks_data: subtasks_rows,
            patients_data: patients_rows,
            search_date: req.params.date,
            doctor_data: doctor_rows
          });
        });
      });
    });
  });
});



app.post('/appointment-insert', checkLoggedIn, function (req, res) {
  const doctor_id = req.session.user.id;

  if (req.body.date == null || req.body.date == undefined) {
    return res.send(feedback("การดำเนินการล้มเหลว: โปรดเลือกวันที่ของท่าน"));
  }
  if (req.body.patient_id == null || req.body.patient_id == undefined || req.body.patient_id == "") {
    return res.send(feedback("การดำเนินการล้มเหลว: โปรดเลือกผู้ป่วยของท่าน"));
  }
  if (req.body.start_time == null || req.body.start_time == undefined || req.body.start_time == "") {
    return res.send(feedback("การดำเนินการล้มเหลว: โปรเลือกเวลาที่ต้องการนัด"));
  }
  if (req.body.subtasks == null || req.body.subtasks == undefined) {
    return res.send(feedback("การดำเนินการล้มเหลว: โปรดเลือกบริการที่นัดให้ครบถ้วน"));
  }

  const patient_sql = ` SELECT firstname FROM Patients\
                        WHERE patient_id = ${req.body.patient_id} `;

  db.all(patient_sql, (patient_err, patient_rows) => {
    if (patient_err || patient_rows == null) {
      return res.send(feedback("การดำเนินการล้มเหลว: โปรดเลือกผู้ป่วยของท่าน"));
    }

    const services_sql = ' SELECT * FROM Services\
                          WHERE status = "Active" ';

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

      // ป้องกันการจองคิวในช่วงคลินิกปิดให้บริการ
      if (!(startDatetimeQueue >= open_clinic_time && endDatetimeQueue <= close_clinic_time)) {
        return res.send(feedback("การดำเนินการล้มเหลว: คลินิกเปิดให้บริการตั้งแต่เวลา 9:00 ถึง 20:00 น. เท่านั้น"));
      }

      // ป้องกันการจองคิวในเวลาพักเที่ยง
      if (!(endDatetimeQueue <= start_break_time || startDatetimeQueue >= end_break_time)) {
        return res.send(feedback("การดำเนินการล้มเหลว: ไม่สามารถนัดในเวลาพักเที่ยงได้ตั้งแต่ 12:00 ถึง 13:00 น."));
      }

      // ป้องกันการจองคิวในอดีต
      if (startDatetimeQueue < todayDate) {
        return res.send(feedback("การดำเนินการล้มเหลว: โปรดอย่านัดในอดีต"));
      }

      // ป้องกันผู้ป่วยจองคิวชนกับคิวอื่นที่ตนเองจองไว้
      const self_collision_subtasks_sql = ` SELECT s.task_id, s.subtask_no, s.room_id, s.doctor_id, s.service_id, s.start_datetime, s.end_datetime FROM Subtasks s\
                                            JOIN Tasks t\
                                            USING (task_id)\
                                            WHERE t.patient_id = ${req.body.patient_id}\
                                            AND DATETIME(s.start_datetime) < DATETIME("${DateToDateString(endDatetimeQueue)} ${DateToTimeString(endDatetimeQueue)}")\
                                            AND DATETIME(s.end_datetime) > DATETIME("${DateToDateString(startDatetimeQueue)} ${DateToTimeString(startDatetimeQueue)}"); `;

      db.all(self_collision_subtasks_sql, (self_collision_subtasks_err, self_collision_subtasks_rows) => {
        if (self_collision_subtasks_err) throw self_collision_subtasks_err;
        if (self_collision_subtasks_rows.length > 0) {
          return res.send(feedback("การดำเนินการล้มเหลว: คิวหรือนัดที่มีอยู่แล้วของผู้ป่วยทับซ้อนกับช่วงเวลาที่ต้องการนัด"));
        }


        // ป้องกันผู้ป่วยจองคิวชนกับคิวที่มีอยู่แล้ว                    // doctor_id = 1 ต้องเปลื่ยน 1 เป็น ${req.session.user.id}
        const collision_subtasks_sql = ` SELECT task_id, subtask_no, room_id, service_id, start_datetime, end_datetime FROM Subtasks\
                                        WHERE doctor_id = 1\
                                        AND DATETIME(start_datetime) < DATETIME("${DateToDateString(endDatetimeQueue)} ${DateToTimeString(endDatetimeQueue)}")\
                                        AND DATETIME(end_datetime) > DATETIME("${DateToDateString(startDatetimeQueue)} ${DateToTimeString(startDatetimeQueue)}"); `;

        db.all(collision_subtasks_sql, (collision_subtasks_err, collision_subtasks_rows) => {
          if (collision_subtasks_err) throw collision_subtasks_err;

          if (collision_subtasks_rows.length > 0) {
            return res.send(feedback("การดำเนินการล้มเหลว: การนัดมีการทับซ้อนเวลากับคิวหรือนัดของคุณ"));
          }

          // Find Available Room

          let inactive_room_sql;

          for (let i = 0; i < insert_subtasks.length; i++) {
            inactive_room_sql = ` SELECT DISTINCT r.room_id, r.name FROM Rooms r\
                              LEFT JOIN Subtasks s\
                              ON (r.room_id = s.room_id)\
                              AND DATETIME(start_datetime) < DATETIME("${DateToDateString(endDatetimeQueue)} ${DateToTimeString(endDatetimeQueue)}")\
                              AND DATETIME(end_datetime) > DATETIME("${DateToDateString(startDatetimeQueue)} ${DateToTimeString(startDatetimeQueue)}")\
                              WHERE s.room_id IS NULL\
                              AND r.category_id = ${insert_subtasks[i].category_id}\
                              ORDER BY r.room_id ASC; `;

            db.all(inactive_room_sql, (inactive_room_err, inactive_room_rows) => {
              if (inactive_room_err) throw inactive_room_err;

              if (inactive_room_rows.length == 0) {
                return res.send(feedback(`การดำเนินการล้มเหลว: ไม่มีห้องว่างสำหรับบริการ "${insert_subtasks[i].service_name}" ในเวลาดังกล่าว`));
              } else {
                insert_subtasks[i].room_id = inactive_room_rows[0].room_id;
              }

              if (i+1 == insert_subtasks.length) {
                // Start Appointment

                const queue_tasks_sql = ` INSERT INTO Tasks (patient_id, start_datetime, end_datetime, is_completed, is_paid) VALUES\
                                          (${req.body.patient_id},\
                                          "${DateToDateString(startDatetimeQueue)} ${DateToTimeString(startDatetimeQueue)}",\
                                          "${DateToDateString(endDatetimeQueue)} ${DateToTimeString(endDatetimeQueue)}",\
                                          "No",\
                                          "No"); `;

                db.run(queue_tasks_sql, function (queue_tasks_err) {
                  if (queue_tasks_err) throw queue_tasks_err;

                  for (let i = 0; i < insert_subtasks.length; i++) {
                    const queue_subtasks_sql = ` INSERT INTO Subtasks (task_id, subtask_no, room_id, doctor_id, service_id, start_datetime, end_datetime) VALUES\
                                    (${this.lastID},\
                                    ${i + 1},\
                                    "${insert_subtasks[i].room_id}",\
                                    ${doctor_id},\
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
              }
            });
          }
        });
      });
    });
  });
});





app.get('/queue', checkLoggedIn, isPatient, function (req, res) {

  // นำไปสู่หน้าจองคิวในวันนี้ทันที

  const todayDate = new Date();
  res.redirect(`/queue/${DateToDateString(todayDate)}`);
});

app.post('/queue-insert', checkLoggedIn, function (req, res) {

  const patient_id = req.session.user.id;

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

      // ป้องกันการจองคิวในช่วงคลินิกปิดให้บริการ
      if (!(startDatetimeQueue >= open_clinic_time && endDatetimeQueue <= close_clinic_time)) {
        return res.send(feedback("การดำเนินการล้มเหลว: คลินิกเปิดให้บริการตั้งแต่เวลา 9:00 ถึง 20:00 น. เท่านั้น"));
      }

      // ป้องกันการจองคิวในเวลาพักเที่ยง
      if (!(endDatetimeQueue <= start_break_time || startDatetimeQueue >= end_break_time)) {
        return res.send(feedback("การดำเนินการล้มเหลว: ไม่สามารถจองคิวในเวลาพักเที่ยงได้ตั้งแต่ 12:00 ถึง 13:00 น."));
      }

      // ป้องกันการจองคิวในอดีต
      if (startDatetimeQueue < todayDate) {
        return res.send(feedback("การดำเนินการล้มเหลว: โปรดอย่าจองคิวในอดีต"));
      }

      // ป้องกันผู้ป่วยจองคิวชนกับคิวอื่นที่ตนเองจองไว้
      const self_collision_subtasks_sql = ` SELECT s.task_id, s.subtask_no, s.room_id, s.doctor_id, s.service_id, s.start_datetime, s.end_datetime FROM Subtasks s\
                                            JOIN Tasks t\
                                            USING (task_id)\
                                            WHERE t.patient_id = ${patient_id}\
                                            AND DATETIME(s.start_datetime) < DATETIME("${DateToDateString(endDatetimeQueue)} ${DateToTimeString(endDatetimeQueue)}")\
                                            AND DATETIME(s.end_datetime) > DATETIME("${DateToDateString(startDatetimeQueue)} ${DateToTimeString(startDatetimeQueue)}"); `;

      db.all(self_collision_subtasks_sql, (self_collision_subtasks_err, self_collision_subtasks_rows) => {
        if (self_collision_subtasks_err) throw self_collision_subtasks_err;
        if (self_collision_subtasks_rows.length > 0) {
          return res.send(feedback("การดำเนินการล้มเหลว: คิวหรือนัดที่มีอยู่แล้วของคุณทับซ้อนกับช่วงเวลาที่ต้องการจองคิว"));
        }


        // ป้องกันผู้ป่วยจองคิวชนกับคิวที่มีอยู่แล้ว
        const collision_subtasks_sql = ` SELECT task_id, subtask_no, room_id, doctor_id, service_id, start_datetime, end_datetime FROM Subtasks\
                                        WHERE doctor_id = ${req.body.doctor_id}\
                                        AND DATETIME(start_datetime) < DATETIME("${DateToDateString(endDatetimeQueue)} ${DateToTimeString(endDatetimeQueue)}")\
                                        AND DATETIME(end_datetime) > DATETIME("${DateToDateString(startDatetimeQueue)} ${DateToTimeString(startDatetimeQueue)}"); `;

        db.all(collision_subtasks_sql, async (collision_subtasks_err, collision_subtasks_rows) => {
          if (collision_subtasks_err) throw collision_subtasks_err;

          if (collision_subtasks_rows.length > 0) {
            return res.send(feedback("การดำเนินการล้มเหลว: การจองคิวของคุณมีการทับซ้อนเวลากับคิวก่อนหน้า"));
          }

          // Find Available Room

          let room_check_message;
          let inactive_room_sql;

          for (let i = 0; i < insert_subtasks.length; i++) {
            inactive_room_sql = ` SELECT DISTINCT r.room_id, r.name FROM Rooms r\
                              LEFT JOIN Subtasks s\
                              ON (r.room_id = s.room_id)\
                              AND DATETIME(start_datetime) < DATETIME("${DateToDateString(endDatetimeQueue)} ${DateToTimeString(endDatetimeQueue)}")\
                              AND DATETIME(end_datetime) > DATETIME("${DateToDateString(startDatetimeQueue)} ${DateToTimeString(startDatetimeQueue)}")\
                              WHERE s.room_id IS NULL\
                              AND r.category_id = ${insert_subtasks[i].category_id}\
                              ORDER BY r.room_id ASC; `;

            db.all(inactive_room_sql, (inactive_room_err, inactive_room_rows) => {
              if (inactive_room_err) throw inactive_room_err;

              if (inactive_room_rows.length == 0) {
                return res.send(feedback(`การดำเนินการล้มเหลว: ไม่มีห้องว่างสำหรับบริการ "${insert_subtasks[i].service_name}" ในเวลาดังกล่าว`));
              } else {
                insert_subtasks[i].room_id = inactive_room_rows[0].room_id;
              }

              if (i+1 == insert_subtasks.length) {
                // Start Queue
                const queue_tasks_sql = ` INSERT INTO Tasks (patient_id, start_datetime, end_datetime, is_completed, is_paid) VALUES\
                (${patient_id},\
                "${DateToDateString(startDatetimeQueue)} ${DateToTimeString(startDatetimeQueue)}",\
                "${DateToDateString(endDatetimeQueue)} ${DateToTimeString(endDatetimeQueue)}",\
                "No",\
                "No"); `;

                db.run(queue_tasks_sql, function (queue_tasks_err) {
                  if (queue_tasks_err) throw queue_tasks_err;

                  for (let i = 0; i < insert_subtasks.length; i++) {
                    const queue_subtasks_sql = ` INSERT INTO Subtasks (task_id, subtask_no, room_id, doctor_id, service_id, start_datetime, end_datetime) VALUES\
                                    (${this.lastID},\
                                    ${i + 1},\
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
              }
            });
          }
        });
      });
    });
  });
});


app.get('/queue/:date', checkLoggedIn, isPatient, function (req, res) {

  // ป้องกันการใส่วันที่ไม่มีอยู่จริง
  if (isNaN(new Date(req.params.date))) {
    return res.redirect("/queue");
  }

  const patient_id = req.session.user.id;

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
    const subtasks_sql = ` SELECT st.task_id AS 'task_id', st.subtask_no AS 'subtask_no', st.doctor_id AS 'doctor_id', st.service_id AS 'service_id', st.start_datetime AS 'start_datetime', st.end_datetime AS 'end_datetime', t.patient_id AS 'patient_id'\
                          FROM (SELECT * FROM Subtasks WHERE DATE(start_datetime) = "${req.params.date}") st\
                          JOIN Tasks t\
                          USING (task_id)\
                          ORDER BY st.task_id ASC, st.subtask_no ASC; `;
    db.all(subtasks_sql, (subtasks_err, subtasks_rows) => {
      if (subtasks_err) throw subtasks_err;
      db.all(services_sql, (services_err, services_rows) => {
        if (services_err) throw services_err;
        db.all(doctors_sql, (doctors_err, doctors_rows) => {
          if (doctors_err) throw doctors_err;
          db.all(service_perms_sql, (service_perms_err, service_perms_rows) => {
            if (service_perms_err) throw service_perms_err;
            res.render('queue', {
              services_data: services_rows,
              tasks_data: tasks_rows,
              subtasks_data: subtasks_rows,
              doctors_data: doctors_rows,
              service_perms_data: service_perms_rows,
              patient_data: patient_id,
              search_date: req.params.date
            });
          });
        });
      });
    });
  });
});



// ----------------------- Schedule ----------------------- //

app.get('/schedule', checkLoggedIn, function (req, res) {

  // นำไปสู่หน้าจองคิวในวันนี้ทันที

  const todayDate = new Date();
  res.redirect(`/schedule/${DateToDateString(todayDate)}`);
});


app.get('/schedule/:date', checkLoggedIn, function (req, res) {

  // ป้องกันการใส่วันที่ไม่มีอยู่จริง
  if (isNaN(new Date(req.params.date))) {
    return res.redirect("/schedule");
  }

  if (req.session.user.usertype != "patient" && req.session.user.usertype != "doctor") {
    return res.redirect("/");
  };


  const id = req.session.user.id;

  const month_tasks_sql = ` SELECT DISTINCT CAST(strftime('%d', start_datetime) AS INTEGER) AS 'day' FROM ${req.session.user.usertype == "doctor" ? "Subtasks" : "Tasks"}\
                            WHERE strftime('%m', start_datetime) = "${req.params.date.split('-')[1]}" \
                            AND ${req.session.user.usertype}_id = ${id}; `


  db.all(month_tasks_sql, (month_tasks_err, month_tasks_rows) => {
    if (month_tasks_err) throw month_tasks_err;

    if (req.session.user.usertype == "patient") {
      const tasks_sql = ` SELECT * FROM Tasks\
                      WHERE DATE(start_datetime) = "${req.params.date}" \
                      AND ${req.session.user.usertype}_id = ${id}; `

      const subtasks_sql = `SELECT st.task_id AS 'task_id', st.subtask_no AS 'subtask_no', st.doctor_id AS 'doctor_id', d.prename || " " || d.firstname || " " || d.lastname AS 'doctor_name', s.name AS 'Specialty', \
                              st.room_id AS 'room_id', st.service_id AS 'service_id', sv.name AS 'service_name', st.start_datetime AS 'start_datetime', st.end_datetime AS 'end_datetime', sv.price AS 'price', sv.duration AS 'duration', sc.name AS 'category_name' FROM Subtasks st\
                              \
                              JOIN (SELECT * FROM Tasks WHERE DATE(start_datetime) = "${req.params.date}") t\
                              USING (task_id)\
                              JOIN Services sv\
                              USING (service_id)\
                              JOIN Service_categories sc\
                              USING (category_id)\
                              JOIN Doctors d\
                              USING (doctor_id)\
                              JOIN Specialties s\
                              USING (specialty_id)
                              WHERE patient_id = ${id}\
                              ORDER BY DATETIME(st.start_datetime) DESC, t.task_id DESC, st.subtask_no DESC; `

      db.all(tasks_sql, (tasks_err, tasks_rows) => {
        if (tasks_err) throw tasks_err;
        db.all(subtasks_sql, (subtasks_err, subtasks_rows) => {
          if (subtasks_err) throw subtasks_err;
          res.render('schedule', {
            tasks_data: tasks_rows,
            subtasks_data: subtasks_rows,
            month_tasks_data: month_tasks_rows,
            search_date: req.params.date
          });
        });
      });
    } else if (req.session.user.usertype == "doctor") {
      const subtasks_sql = `SELECT st.task_id AS 'task_id', st.subtask_no AS 'subtask_no', p.patient_id AS 'patient_id', p.prename || " " || p.firstname || " " || p.lastname AS 'patient_name', \
                              st.room_id AS 'room_id', r.name AS 'room_name', st.service_id AS 'service_id', sv.name AS 'service_name', st.start_datetime AS 'start_datetime', st.end_datetime AS 'end_datetime', sv.price AS 'price', sv.duration AS 'duration', sc.name AS 'category_name' FROM Subtasks st\
                              \
                              JOIN (SELECT * FROM Tasks WHERE DATE(start_datetime) = "${req.params.date}") t\
                              USING (task_id)\
                              JOIN Services sv\
                              USING (service_id)\
                              JOIN Service_categories sc\
                              USING (category_id)\
                              JOIN Patients p\
                              USING (patient_id)\
                              JOIN Rooms r\
                              USING (room_id)\
                              WHERE doctor_id = ${id}\
                              ORDER BY DATETIME(st.start_datetime) DESC, t.task_id DESC, st.subtask_no DESC; `;

      db.all(subtasks_sql, (subtasks_err, subtasks_rows) => {
        if (subtasks_err) throw subtasks_err;
        console.log(subtasks_rows);
        res.render('schedule', {
          subtasks_data: subtasks_rows,
          month_tasks_data: month_tasks_rows,
          search_date: req.params.date
        });
      });
    }
  });
});

app.listen(port, () => {
  console.log(`listening to port ${port}`);
}); 