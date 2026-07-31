const Department =
require("../models/departmentModel");



// ==============================

exports.getDepartments=(req,res)=>{

Department.getDepartments(

(err,rows)=>{

if(err){

return res.status(500).json(err);

}

res.json(rows);

}

);

};



// ==============================

exports.getSections=(req,res)=>{

Department.getSections(

req.params.department,

(err,rows)=>{

if(err){

return res.status(500).json(err);

}

res.json(rows);

}

);

};