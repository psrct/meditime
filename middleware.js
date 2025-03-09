exports.checkLoggedIn = (req, res, next) =>{
    if(req.session.user.isLoggedin){
        next();
    }else{
        // console.log(!req.session.user);
        // console.log("Your're not login");
        res.redirect('/login');
    }
}

exports.bypasslogin = (req, res, next)=>{
    if(!req.session.user.isLoggedin){
        next()
    }else{
        res.redirect('/');
    }
}

exports.isOwner = (req, res, next)=>{
    if(req.session.user.usertype == "clinic_owner"){
        next()
    }else{
        res.redirect('/schedule');
    }
}

exports.isDoctor = (req, res, next)=>{
    if(req.session.user.usertype == "doctor"){
        next()
    }else{
        res.redirect('/');
    }
}

exports.isPatient = (req, res, next)=>{
    if(req.session.user.usertype == "patient"){
        next()
    }else{
        res.redirect('/');
    }
}