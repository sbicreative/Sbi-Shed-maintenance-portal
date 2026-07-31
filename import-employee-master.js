const { importMasterWorkbook } = require("./lib/importMasterWorkbook");

importMasterWorkbook({
    filePath: "Project Documents/MASTER/Employee Master.xlsx",
    table: "employee_master",
    fields: {
        department: "Department",
        section: "Section",
        name: "Name",
        designation: "Designation"
    },
    apply: process.argv.includes("--apply")
}).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
