const express=require('express');
const app=express();
const bodyParser=require('body-parser');
const mongoose=require('mongoose');
const auth=require(__dirname+'/auth.js');
const crud=require(__dirname+"/crud.js");
const session=require('express-session');
const { name } = require('ejs');
var totalTeams;
var teamMatches;
var allMatches;

mongoose.connect('mongodb://localhost:27017/leagueDB',{ useNewUrlParser: true, useUnifiedTopology: true});

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({secret: "createLeague.org",
                resave: false,
                saveUninitialized: false}));

//mongoose model ============================================================
const teamSchma=mongoose.Schema({
    name: String,
    won: Number,
    lost: Number,
    drew: Number,
    played: Number,
    toPlay: Number,
    points: Number,
    forgoal: Number,
    awaygoal: Number
});
const Team=mongoose.model('team',teamSchma);

const matcheSchema=mongoose.Schema({
    name: String,
    teamA: teamSchma,
    teamB: teamSchma,
    won: String,
    lost: String,
    drew: Number,
    day: Number,
    score: String
});
const Match=mongoose.model('match',matcheSchema);

const leagueSchema=mongoose.Schema({
    name: String,
    teams: [teamSchma],
    fix: matcheSchema
});
const League=mongoose.model('league',leagueSchema)

const userSchema=mongoose.Schema({
    username: String,
    league: [String]

});
const User=new mongoose.model('user',userSchema);
//====================================================================
//mongoose models

function checkAuth(req,res,next){
    if(req.session.user){
        next();
    }
    else{
        res.status(400);
        res.render('index',{message: 'plz login to enter to the page'});
    }
}

function leagueAuth(req,res,next){
    const leagueName=req.params.lname;
    const sessionLeagues= req.session.user[0].league;
    if((sessionLeagues.indexOf(leagueName)>=0)||(sessionLeagues==null)){
        next();
    }
 else{
        res.status(400);
        res.render('index',{message: 'you are not authorized to view others leagues'});

    }
}

//app.gets
app.get('/',(req,res)=>{

    res.render('index',{message: ''});
});

app.get('/register',(req,res)=>{

    res.render('register',{message: ''});
});
//==================================================================
//authenticated pages
//app.gets======================================>
app.get('/home',checkAuth,(req,res)=>{
    const uname=req.session.user[0].username;
    User.find({username: uname},(err,item)=>{
        if(err){console.log(err);}
        else{
            const leagues=item[0].league;
            req.session.user[0].league=leagues;
            res.render('home',{uleague: leagues});
        }
    });
})

app.get('/create',checkAuth,(req,res)=>{
    res.render('create',{message:" "});
})


app.get('/league',checkAuth,(req,res)=>{
    res.render('league');
});

//need league auth
app.get("/myLeagues/:lname",checkAuth,leagueAuth,(req,res)=>{
    const leagueName=req.params.lname;
    //show fixtures
    Match.find({name: leagueName},null, {sort: {day: "asc"}},(err,item)=>{
        if(err){console.log(err);}
        else{
          
             // table
            League.find({name: leagueName},(err,item2)=>{
                if(err){console.log(err);}
                else{
                     League.aggregate([ { $match: { name: leagueName } },{$unwind: "$teams"},{$sort: {"teams.points": -1}}, {$group: {_id: "$_id", teams: {$push: "$teams"}}},{$project: {teams: "$teams"}}],(err,item3)=>{
                if(err){console.log(err);}
                else{
                 
                    res.render("myLeagues",{leagueName: leagueName, matches: item, teams: item3[0].teams});
                }
            });//league sort 
            }
            });//league find
        }
    });
   
   

});
//need league auth
app.get('/update/:day/:lname',checkAuth,leagueAuth,(req,res)=>{
    const day=req.params.day
    const leagueName=req.params.lname
    Match.find({name: leagueName, day: day},(err,item)=>{
        if(err){console.log(err);}
        else{
            res.render('update',{day: day, 
                                leagueName: leagueName, 
                                teamA: item[0].teamA.name, 
                                teamB: item[0].teamB.name});
        }
    })
   
});

//app.posts=======================================>
app.post('/',(req,res)=>{
    const uname=req.body.username;
    auth.login(User,uname,req,res);

})

app.post('/register',(req,res)=>{
    const uname=req.body.username;
    const newUser=new User({username: uname});
    auth.register(User,newUser,req,res);

});

app.post('/create',(req,res)=>{
    const leagueName=req.body.leagueName;
    const uname=req.session.user[0].username;
    const newLeague=League({name: leagueName});
    League.find({name: leagueName},(err,found)=>{
        if(err){console.log(err)}
        else if(found.length>0){
            res.render('create',{message: "league already created by other user"});
        }
        else{
            crud.insert(League,newLeague,req,res);
    User.updateMany({username: uname}, {$push: {'league': leagueName}},(err)=>{
        if(err){console.log(err);}
        else{console.log('success updated=> ');    
    }
    });
  
    res.render('info',{message: '', totalTeams: 0, lname: leagueName});}
    });
    
});

app.post('/info/:lname',(req,res)=>{
    const leagueName=req.params.lname;
    totalTeams=req.body.totalTeams;
    teamMatches=req.body.noMatches;
    console.log(totalTeams);
    res.render('info',{totalTeams: totalTeams, message:'', lname: leagueName});

})

app.post('/team/:lname',(req,res)=>{
   const team=req.body.team;
   const uname=req.session.user[0].username;
   const leagueName=req.params.lname;
   const teams=[];
   allMatches=calcMatches(totalTeams,teamMatches);
   console.log(team)
   if(auth.teamsAuth(totalTeams)){
       for(var i=0;i<totalTeams;i++){
        const newTeam=new Team({name: team[i],
            won: 0,
            lost: 0,
            drew: 0,
            played: 0,
            toPlay: allMatches,
            points: 0,
            forgoal: 0,
            awaygoal: 0 });
            
            teams.push(newTeam);
        
   }
   League.updateMany({name: leagueName},{teams: teams},(err)=>{
    if(err){console.log(err);}
    else{console.log('updated league')}
});
    
    res.render('league',{leagueName: leagueName,totalMatches : allMatches});
}   
else{
    res.render('info',{totalTeams: totalTeams, message:'please check your team entry', lname: leagueName});
}   

});
//##########################################################################################################################
//setting fictures
app.post('/league/:lname',(req,res)=>{
const leagueName=req.params.lname;
 const days=req.body.days;
const randDays=shuffle(days);
//create fixtures
League.find({name: leagueName},(err,item)=>{
  if(err){console.log(err);}
    else{
        let fix=[];
        //if even 
        if(teamMatches%2==0){
            for(var i=0;i<(Math.floor(teamMatches/2));i++){
                for(var j=0;j<totalTeams;j++){
                    for(var k=0;k<totalTeams;k++){
                         if(k!=j){
                           const newMatch= new Match({teamA: item[0].teams[j],
                                                        teamB: item[0].teams[k]});
                                fix.push(newMatch);
                            
                             }//if
                         }//k
                    }//j
                }//i 
    }//if
    //if odd
        else{
            for(var i=0;i<(Math.floor(teamMatches/2));i++){
                for(var j=0;j<totalTeams;j++){
                    for(var k=0;k<totalTeams;k++){
                         if(k!=j){
                            const newMatch= new Match({teamA: item[0].teams[j],
                                                        teamB: item[0].teams[k]});
                                fix.push(newMatch);
                          
                             }//if
                         }//k
                    }//j
                }//i
                //adding 1 
                for(var i=0;i<totalTeams;i++){
                    for(j=i+1;j<totalTeams;j++){
                        const newMatch= new Match({teamA: item[0].teams[i],
                            teamB: item[0].teams[j]});
                        fix.push(newMatch);
                       
                    }
                    
                }
               // console.log(fix);
        }  //else  for odd number
        for(var i=0;i<allMatches;i++){
            const newFixture=new Match({
                name: leagueName,
                teamA: fix[i].teamA,
                teamB: fix[i].teamB,
                day: randDays[i]
            });
        crud.insert(Match,newFixture,req,res);
        }

    }  //else  


});
res.redirect('/home');
});
//updating league

app.post('/update/:day/:lname',(req,res)=>{
    const winTeam=req.body.result
    const score=String(req.body.winner)+"-"+String(req.body.looser);
    const winnerPlusGoal=req.body.winner;
    const winnerAwayGoal=req.body.looser;
    const leagueName=req.params.lname;
    const day=req.params.day
    const filter={name: leagueName, day: day};
    const pLayout={
        win: 5,
        lost: -2,
        draw: 2,
        plusGoal: 1,
        conGoal: -1
    }
    const winPoint=pLayout.win + (pLayout.plusGoal*(req.body.winner)) + (pLayout.conGoal*(req.body.looser));
    const lostPoint=pLayout.lost + (pLayout.plusGoal*(req.body.looser)) + (pLayout.conGoal*(req.body.winner));
    const drawPoint=pLayout.draw + (2*(pLayout.plusGoal*(req.body.looser)));
    console.log(lostPoint );
var lostTeam;

    //fix update
   Match.find( filter,(err,item)=>{
        if(err){console.log(err);}
        else if(winTeam==item[0].teamA.name){
            Match.updateMany(filter,{$set: {won: item[0].teamA.name, lost: item[0].teamB.name, score: score, drew: 0}},(err)=>{
                if(err){console.log(err);}
                else{console.log("updated league");lostTeam=item[0].teamB.name; console.log(lostTeam);}
            });
        }//codition if team A wins
        else if(winTeam==item[0].teamB.name){
            Match.updateMany(filter,{$set: {won: item[0].teamB.name, lost: item[0].teamA.name, score: score, drew: 0}},(err)=>{
                if(err){console.log(err);}
                else{console.log("updated league");lostTeam=item[0].teamA.name;console.log(lostTeam);}
            });
        }//condition if team B wins
        else{
            Match.updateMany(filter,{$set: {score: score, drew: 1}},(err)=>{
                if(err){console.log(err);}
                else{console.log("updated league");}
            });
        }//if draw
   });

    //league update
   const leagueFilter={name: leagueName}
   Match.find(filter,(err,item)=>{
    if(err){console.log(err);}
    //winning team
    else{
        
        
        if(item[0].drew!=1){ 
            if(winTeam==item[0].teamA.name){ 
                //updating winnning team 
                League.updateMany(leagueFilter,{
        "$inc": {"teams.$[element].won" : 1, "teams.$[element].points": winPoint, "teams.$[element].forgoal": req.body.winner, "team.$[element].awaygoal": req.body.looser, "teams.$[element].played": 1, "teams.$[element].toPlay": -1}
    },{ arrayFilters: [{"element.name": item[0].teamA.name}]},(err)=>{
        if(err){console.log(err);}
        else{console.log('updated');}
    });
    //updating points for team that lost
    League.updateMany(leagueFilter,{
        "$inc": {"teams.$[element].lost" : 1, "teams.$[element].points": lostPoint, "teams.$[element].forgoal": req.body.looser, "team.$[element].awaygoal": req.body.winner, "teams.$[element].played": 1, "teams.$[element].toPlay": -1}
    },{ arrayFilters: [{"element.name": item[0].teamB.name}]},(err)=>{
        if(err){console.log(err);}
        else{console.log('updated');}
    });
}// if team A won 
    else{
         //updating winnning team 
         League.updateMany(leagueFilter,{
            "$inc": {"teams.$[element].won" : 1, "teams.$[element].points": winPoint, "teams.$[element].forgoal": req.body.winner, "team.$[element].awaygoal": req.body.looser, "teams.$[element].played": 1, "teams.$[element].toPlay": -1}
        },{ arrayFilters: [{"element.name": item[0].teamB.name}]},(err)=>{
            if(err){console.log(err);}
            else{console.log('updated');}
        });
        //updating points for team that lost
        League.updateMany(leagueFilter,{
            "$inc": {"teams.$[element].lost" : 1, "teams.$[element].points": lostPoint, "teams.$[element].forgoal": req.body.looser, "team.$[element].awaygoal": req.body.winner, "teams.$[element].played": 1, "teams.$[element].toPlay": -1}
        },{ arrayFilters: [{"element.name": item[0].teamA.name}]},(err)=>{
            if(err){console.log(err);}
            else{console.log('updated');}
        });
    }//if teamA did not win 
           

}//if not draw
    else{
        //team A
        League.updateMany(leagueFilter,{
            "$inc": {"teams.$[element].drew" : 1, "teams.$[element].points": drawPoint, "teams.$[element].forgoal": req.body.looser, "team.$[element].awaygoal": req.body.winner, "teams.$[element].played": 1, "teams.$[element].toPlay": -1}
        },{ arrayFilters: [{"element.name": item[0].teamA.name}]},(err)=>{
            if(err){console.log(err);}
            else{console.log('updated');}
        });
        //teamB
        League.updateMany(leagueFilter,{
            "$inc": {"teams.$[element].drew" : 1, "teams.$[element].points": drawPoint, "teams.$[element].forgoal": req.body.looser, "team.$[element].awaygoal": req.body.winner, "teams.$[element].played": 1, "teams.$[element].toPlay": -1}
        },{ arrayFilters: [{"element.name": item[0].teamB.name}]},(err)=>{
            if(err){console.log(err);}
            else{console.log('updated');}
        });

    } //if draw  
        

    }// if not error 
    
   
});
    
    
   res.redirect('/myleagues/'+leagueName);
})


//app.posts end
//calc function====================================================================
function calcMatches(teams,matches){
    var totalMatches;
if(Math.floor(matches%2)==0){
    totalMatches=(teams-1)*teams;
    return totalMatches;
}
 totalMatches=((teams-1)*teams)/2;
 return totalMatches;
}

function shuffle(array) {
    var i = array.length,
        j = 0,
        temp;

    while (i--) {

        j = Math.floor(Math.random() * (i+1));

        // swap randomly chosen element with current element
        temp = array[i];
        array[i] = array[j];
        array[j] = temp;

    }

    return array;
}
//

app.listen(3000,(err)=>{
    if(err){
        console.log(err);
    }
    else{
        console.log('server Running');
    }
});