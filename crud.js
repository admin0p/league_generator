module.exports.insert=insert;

function insert(Model,data,req,res,status){
    var status;
    Model.insertMany(data,(err,item)=>{
        if(err){console.log(err);}
        else{console.log('inserted successfully');}
    });
}