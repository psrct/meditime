const express = require('express')
const app = express()
const port = 3000
const path = require('path');
const bcrypt = require('bcrypt');

const conn = require('./database.js');

app.use(express.static('webpages'));


app.get('/login', function(req, res){
  res.sendFile(path.join(__dirname, '/webpages/login.html'));
});

app.get('/login/start', function(req, res){
  let loginData = {
    username: req.query.username,
    password: req.query.password,
    };
    // console.log(loginData);  
    const sql = `select * from users where username = "${loginData.username}" `;
    conn.all(sql, function(err, rows){
      console.log(rows);
      if(rows.length < 1){
        res.send("<script>alert('ไม่พบบัญชีผู้ใช้'); window.location.href = './';</script> ")
      }else if(loginData.password != rows[0].passpword){
        res.send("<script>alert('รหัสผ่านไม่ถูกต้อง'); window.location.href = './';</script> ")
      }else{
        res.redirect("/home");
      }
    })
});

app.get('/register', function(req, res){
  res.sendFile(path.join(__dirname, '/webpages/register.html'));
});

app.get('/register/start', function(req, res){
  let registerData = {
    username: req.query.username,
    password: req.query.password,
    };
    console.log(registerData);  
    const sql = `insert into users(username, passpword) values("${registerData.username}", "${registerData.password}") `;
    conn.run(sql, function(err){
      if (err) throw err;
      console.log("Add user successfully.");
    });
    res.sendFile(path.join(__dirname, '/webpages/register.html'));
});

app.get('/home', function(req, res){
  res.sendFile(path.join(__dirname, '/webpages/home.html'));
})


app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})