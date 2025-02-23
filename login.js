const express = require('express')
const app = express()
const port = 3000
const path = require('path');
const bcrypt = require('bcrypt');

const conn = require('./database.js');
const session = require('express-session');
const { checkLoggedIn, bypasslogin } = require('./middleware.js');
const { time } = require('console');

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
  conn.all(sql, function(err, rows){
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
  conn.all(sql, function(err, rows){
    console.log(rows);
    if(rows.length < 1){
      res.send("<script>alert('ไม่พบบัญชีผู้ใช้'); window.location.href = '/login-staff';</script> ")
    }else if(loginData.password != rows[0].password){
      res.send("<script>alert('รหัสผ่านไม่ถูกต้อง'); window.location.href = '/login-staff';</script> ")
    }else if(loginData.username === "Dsompact "){
      req.session.user = {
        id: rows[0].doctor_id,
        username: rows[0].username,
        specialty: rows[0].specialty_id,
        usertype: "clinic_owner"
      }
      res.redirect("/manage-staff");
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

app.get('/register', function(req, res){
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
    conn.run(sql, function(err){
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

app.get('/', checkLoggedIn, function(req, res){
  res.render('home');
})

app.get('/home-staff', checkLoggedIn, function(req, res){
  res.render('home-staff');
})

app.get('/profile', checkLoggedIn, function(req, res){
  console.log(`this is session for user ${req.session.user}`);
  const sql = `select prename, firstname, lastname, birth_date, gender, username from Patients where patient_id = ${req.session.user.id} `;
  conn.all(sql, function(err, rows){
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
    gender : req.body.gender
  }
  const sql = `update Patients set
    prename = "${updateData.prename}",
    firstname = "${updateData.fname}",
    lastname = "${updateData.lname}",
    gender = "${updateData.gender}"
    where patient_id = ${req.session.user.id} `;
  conn.run(sql, function(err){
    if (err) throw err;
    res.redirect("/profile");
    });
})

app.get('/manage-staff', checkLoggedIn, function(req, res){
  const sql = `select * from Doctors`;
  conn.all(sql, function(err, rows){
    // console.log(rows);
    res.render('manage-staff', {data : rows});
    });
})

app.get('/edit-staff/:id', checkLoggedIn, function(req, res){
  const sql = `select * from Doctors where doctor_id = ${req.params.id} `;
  conn.all(sql, function(err, rows){
    console.log(rows);
    res.render('profile-staff', {data : rows});
    });
})

app.post('/edit-staff/:id', checkLoggedIn, function(req, res){
  let updateData = {
    id : req.params.id,
    prename : req.body.prename,
    fname : req.body.firstname,
    lname : req.body.lastname,
    retire_date : req.body.retire_date,
    gender : req.body.gender
  }
  const sql = `update Doctors set
    prename = "${updateData.prename}",
    firstname = "${updateData.fname}",
    lastname = "${updateData.lname}",
    gender = "${updateData.gender}"
    where doctor_id = ${updateData.id} `;
  conn.run(sql, function(err){
    if (err) throw err;
    res.redirect(`/edit-staff/${updateData.id}`);
    });
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})