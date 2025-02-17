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
    console.log(rows);
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
    }else if(loginData.username === "admin"){
      req.session.user = {
        id: rows[0].doctor_id,
        username: rows[0].username,
        specialty: rows[0].specialty_id,
        usertype: "clinic_owner"
      }
      res.redirect("/");
    }
    else{
      req.session.user = {
        id: rows[0].doctor_id,
        username: rows[0].username,
        specialty: rows[0].specialty_id,
        usertype: "doctor"
      }
      res.redirect("/");
    }
  });
});

app.get('/register', function(req, res){
  res.render("register");
});

app.post('/register', bypasslogin, function(req, res){
  var cur_time = new Date().toUTCString();
  console.log(cur_time);

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
     "${registerData.firstname}"),
     "${registerData.lastname}"),
     "${registerData.birth_date}"),
     "${registerData.gender}"),
     "${cur_time}"),
     "${registerData.username}"),
     "${registerData.password}")
      `;
    conn.run(sql, function(err){
      if (err) throw err;
      console.log("Add user successfully.");
    });
    res.redirect('/');
});

app.get('/', checkLoggedIn, function(req, res){
  res.render('home');
})

app.get('/logout', function(req, res){
  req.session.destroy();
  res.clearCookie('user');
  res.redirect('/');
})


app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})