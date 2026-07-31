const Employee = require("../models/employee");

// ===========================================
// Register Employee
// ===========================================

exports.register = (req, res) => {

    const employee = {

        name: req.body.name,
        mobile: req.body.mobile,
        pf_no: req.body.pf_no,
        department: req.body.department,
        section: req.body.section,
        designation: req.body.designation,
        role: req.body.role

    };

    Employee.registerEmployee(employee, (err, result) => {

        if (err) {

            console.log(err);

            return res.json({

                success: false,

                message: "Employee already registered."

            });

        }

        res.json({

            success: true,

            message: "Registration Successful"

        });

    });

};


// ===========================================
// Login Employee
// ===========================================

exports.login = (req, res) => {

    const { name, mobile } = req.body;

    Employee.loginEmployee(name, mobile, (err, employee) => {

        if (err) {

            console.log(err);

            return res.json({

                success: false,

                message: "Database Error"

            });

        }

        if (!employee) {

            return res.json({

                success: false,

                message: "Invalid Name or Mobile Number"

            });

        }

        let dashboard = "";

        switch (employee.role) {

            case "Incharge":

                dashboard = "/dashboard/incharge.html";
                break;

            case "Supervisor":

                dashboard = "/dashboard/supervisor.html";
                break;

            case "Staff":

                dashboard = "/dashboard/staff.html";
                break;

            case "Viewer":

                dashboard = "/dashboard/viewer.html";
                break;

            default:

                dashboard = "/dashboard/viewer.html";

        }

        res.json({

            success: true,

            employee,

            dashboard

        });

    });

};