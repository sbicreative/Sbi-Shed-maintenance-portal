const db = require("../config/db");


// ===================================
// Get Department
// ===================================

exports.getDepartments = (callback)=>{

    db.all(

        `SELECT
            id,
            department_name
         FROM department_master
         ORDER BY department_name`,

         callback

    );

};



// ===================================
// Get Section
// ===================================

exports.getSections=(department_id,callback)=>{

    db.all(

        `SELECT

            id,
            section_name

        FROM section_master

        WHERE department_id=?

        ORDER BY section_name`,

        [department_id],

        callback

    );

};