const db = require("../config/db");

// ==========================================
// Register New Employee
// ==========================================

function registerEmployee(employee, callback) {

    const sql = `
    INSERT INTO employees
    (
        name,
        mobile,
        pf_no,
        department,
        section,
        designation,
        role
    )
    VALUES
    (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [
            employee.name,
            employee.mobile,
            employee.pf_no,
            employee.department,
            employee.section,
            employee.designation,
            employee.role || "Staff"
        ],
        function (err) {

            callback(err, this);

        }
    );

}



// ==========================================
// Login
// ==========================================

function loginEmployee(name, mobile, callback) {

    const sql = `
    SELECT *
    FROM employees
    WHERE
    name = ?
    AND
    mobile = ?
    `;

    db.get(sql, [name, mobile], callback);

}



// ==========================================
// Get Employee By ID
// ==========================================

function getEmployee(id, callback) {

    db.get(

        "SELECT * FROM employees WHERE id=?",

        [id],

        callback

    );

}



// ==========================================
// Get All Employees
// ==========================================

function getAllEmployees(callback) {

    db.all(

        "SELECT * FROM employees ORDER BY department,section,name",

        callback

    );

}



module.exports = {

    registerEmployee,

    loginEmployee,

    getEmployee,

    getAllEmployees

};