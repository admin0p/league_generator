const session = require("express-session");

module.exports.register=register;

function register(Model,user,req,res){
    Model.find({username: user.username},(err,item)=>{
        if(err){
            console.log(err);
        }
        else if(item.length!=0){
            res.render('register',{message: "user already exist"});

        }
        else{
            Model.insertMany(user,(err,item)=>{
                if(err){
                    console.log(err);
                }
                else{
                    console.log(item+" => inserted");
                    req.session.user=item;
                    res.redirect('/home');
                }
            });
        }
    });

}

module.exports.login=login;

function login(Model,user,req,res){
    Model.find({username: user},(err,item)=>{
        if(err){
            console.log(err);
        }
        else if(item.length==0){
            res.render('index',{message: "no user exist...plz register"});
        }
        else{
            req.session.user=item;
            res.redirect('home');
        }
    });
}

module.exports.teamsAuth=teamsAuth;

function teamsAuth(team){
    console.log(team);
    if(team.indexOf('')>0){
        console.log('1st condition');
        return false;
    }
    if(findDupilcate(team)){
        console.log('2nd condi');
        return false;
    }
    console.log('success');
    return true;    
}

function findDupilcate(team){
    var check=[];
    for(var i=0;i<team.length;i++){
        if(check[team[i]]){
            check[team[i]]+=1;
        }
        else{
            check[team[i]]=0;
        }
    }

    for(var i=0;i<team.length;i++){
        if(check[team[i]]>0){
            return true;
        }
    }
    return false;
}

