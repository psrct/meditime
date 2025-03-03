const express = require('express')
const app = express()
const port = 3000
const path = require('path');
const bcrypt = require('bcrypt');

const db = require('./database.js');
const session = require('express-session');
const { checkLoggedIn, bypasslogin, isOwner, isStaff } = require('./middleware.js');
const { json } = require('stream/consumers');

app.use(express.json());
app.use(express.static('webpages'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: 'my_session_secret',
  resave: true,
  saveUninitialized: false,
  name: 'user',
  cookie: {
    maxAge: 18000000
  }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
})


// -------------------------------- LOGIN SYSTEMS --------------------------------------------------------

app.get('/login', bypasslogin, function(req, res){
  res.render('login');
});

app.post('/login', function(req, res){
  console.log(req.body);
  let loginData = {
    username: req.body.username,
    password: req.body.password
  }
  const sql = `select * from Patients where username = "${loginData.username}" `;
  db.all(sql, function(err, rows){
    // console.log(rows);
    if(rows.length < 1){
      res.send("<script>alert('ไม่พบบัญชีผู้ใช้'); window.location.href = '/login';</script> ")
    }else if(loginData.password != rows[0].password){
      res.send("<script>alert('รหัสผ่านไม่ถูกต้อง'); window.location.href = '/login';</script> ")
    }else{
      req.session.user = {
        id: rows[0].patient_id,
        username: rows[0].username,
        usertype: "patient"
      }
      res.redirect("/");
    }
  });
});

app.get('/login-staff', bypasslogin, function(req, res){
  res.render('login-staff');
});

app.post('/login-staff', function(req, res){
  console.log(req.body);
  let loginData = {
    username: req.body.username,
    password: req.body.password
  }
  const sql = `select * from Doctors where username = "${loginData.username}" `;
  db.all(sql, function(err, rows){
    console.log(rows);
    if(rows.length < 1){
      res.send("<script>alert('ไม่พบบัญชีผู้ใช้'); window.location.href = '/login-staff';</script> ")
    }else if(loginData.password != rows[0].password){
      res.send("<script>alert('รหัสผ่านไม่ถูกต้อง'); window.location.href = '/login-staff';</script> ")
    }else if(loginData.username === "Dsompact"){
      req.session.user = {
        id: rows[0].doctor_id,
        username: rows[0].username,
        specialty: rows[0].specialty_id,
        usertype: "clinic_owner"
      }
      res.redirect("/showservices");
    }
    else{
      req.session.user = {
        id: rows[0].doctor_id,
        username: rows[0].username,
        specialty: rows[0].specialty_id,
        usertype: "doctor"
      }
      res.redirect("/home-staff");
    }
  });
});

app.get('/register',bypasslogin, function(req, res){
  res.render("register");
});

app.post('/register', bypasslogin, function(req, res){
  var cur_time = new Date();
  var time_conv = `${cur_time.getFullYear()}-`+`${cur_time.getMonth()+1}-`.padStart(3, "0")+`${cur_time.getDate()}`.padStart(2, "0")+` ${cur_time.getHours()}:${cur_time.getMinutes()}:${cur_time.getSeconds()}`;
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
    db.run(sql, function(err){
      if (err) throw err;
      console.log("Add user successfully.");
    });
    res.redirect('/register');
});

app.get('/logout', function(req, res){
  req.session.destroy();
  res.clearCookie('user');
  res.redirect('/');
})


// --------------------------------  FOR PATIENT --------------------------------------------------------

app.get('/profile', checkLoggedIn, function(req, res){
  console.log(`this is session for user ${req.session.user}`);
  const sql = `select prename, firstname, lastname, birth_date, gender, username, iden_id, contact_number, add_contact_number, medical_conditions from Patients where patient_id = ${req.session.user.id} `;
  db.all(sql, function(err, rows){
    console.log(rows);
    res.render('profile', {data : rows});
    });
})

app.post('/profile', checkLoggedIn, function(req, res){
  let updateData = {
    prename : req.body.prename,
    fname : req.body.firstname,
    lname : req.body.lastname,
    birth_date : req.body.birth_date,
    gender : req.body.gender,
    iden_id : req.body.iden_id,
    connum : req.body.contact_num,
    add_connum : req.body.add_contact,
    medcon : req.body.medical_conditions
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
  db.run(sql, function(err){
    if (err) throw err;
    res.redirect("/profile");
    });
})

app.get('/', checkLoggedIn, function(req, res){
    res.render('home');
})

// -------------------------------------- FOR CLINIC OWNER -------------------------------------------------------


app.get('/manage-staff', checkLoggedIn, isOwner, function(req, res){
  const sql = `select d.doctor_id, d.prename, d.firstname, d.lastname, d.gender, d.contact_number, d.specialty_id, s.name, d.hire_date, d.retire_date, d.username, d.password 
  from Doctors d join Specialties s using(specialty_id)`;
  db.all(sql, function(err, rows){
    // console.log(JSON.stringify(rows));
    res.render('manage-staff', {data : rows});
    });
})

app.get('/edit-staff/:id', checkLoggedIn, isOwner, function(req, res){
  const sql = `select * from Doctors where doctor_id = ${req.params.id} `;
  db.all(sql, function(err, rows){
    console.log(rows);
    db.all("select * from Specialties", (err, result) =>{
      if(err) throw err;
      var str = `{ "docinfo" : ` + JSON.stringify(rows) + `, "specialtyinfo" : ` + JSON.stringify(result) + `}`;
      console.log(typeof(str));
      console.log(JSON.parse(str));
      res.render('profile-staff', {data : JSON.parse(str)});
    })
    });
})

app.post('/edit-staff/:id', checkLoggedIn, isOwner, function(req, res){
  let updateData = {
    id : req.params.id,
    // prename : req.body.prename,
    username : req.body.username,
    password : req.body.password,
    contact_number : req.body.contact_number,
    fname : req.body.firstname,
    lname : req.body.lastname,
    retire_date : req.body.retire_date,
    gender : req.body.gender,
    specialty_id : req.body.specialty_id
  }

  let prename = "";

  if(updateData.gender == "Male"){
    prename = "นายแพทย์";
  }else{
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
  db.run(sql, function(err){
    if (err) throw err;
    res.redirect(`/edit-staff/${updateData.id}`);
    });
})

app.get('/add-staff', checkLoggedIn, isOwner, function(req, res){
    const sql = `select * from Specialties`;
    db.all(sql, function(err, rows){
        console.log(rows);
      // console.log(rows);
      res.render('add-doctor', {data : rows});
      });
  })

app.post('/add-staff', checkLoggedIn, isOwner, function(req, res){
    var cur_time = new Date();
    var time_conv = `${cur_time.getFullYear()}-`+`${cur_time.getMonth()+1}-`.padStart(3, "0")+`${cur_time.getDate()}`.padStart(2, "0")+` ${cur_time.getHours()}:${cur_time.getMinutes()}:${cur_time.getSeconds()}`;
    console.log(time_conv);

    console.log(req.body);
    let registerData = {
        username: req.body.username,
        password: req.body.password,
        prename: req.body.prename,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        gender: req.body.gender,
        specialty_id: req.body.specialty
        };
        console.log(registerData);  
        const sql = `insert into Doctors(prename, firstname, lastname, hire_date, retire_date, specialty_id, gender, username, password) 
        values("${registerData.prename}",
        "${registerData.firstname}",
        "${registerData.lastname}",
        "${time_conv}",
        NULL,
        ${registerData.specialty_id},
        "${registerData.gender}",
        "${registerData.username}",
        "${registerData.password}")`;
        db.run(sql, function(err){
        if (err) throw err;
        console.log("Add user successfully.");
        });
        res.redirect('/manage-staff');
});

app.get('/remove-staff/:id', checkLoggedIn, isOwner, function(req, res){
  const sql = `delete from Doctors where doctor_id = ${req.params.id} `;
  db.run(sql, function(err){
    if (err) throw err;
    res.redirect("/manage-staff");
    });
})

app.get('/showservices', checkLoggedIn, isOwner, function (req, res) {
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
  app.post('/add-service',checkLoggedIn, isOwner, function (req, res) {
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
app.get('/showservices/:id',checkLoggedIn, isOwner, function(req, res){
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
app.post('/edit-service',checkLoggedIn, isOwner, function (req, res) {
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
app.get('/deleteservice/:id',checkLoggedIn, isOwner, (req, res) => {
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

// -------------------------------------- FOR STAFF  -------------------------------------------------------

  
app.get('/home-staff', checkLoggedIn, isStaff, function(req, res){
    res.render('home-staff');
})


app.get('/showdata',checkLoggedIn, isOwner || isStaff, function (req, res) {
    const query = 'SELECT * FROM Tasks;';
    db.all(query, (err, rows) => {
      if (err) {
        console.log(err.message);
      }
      console.log(rows);
      res.render('data', { data: rows });
    });
  });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})