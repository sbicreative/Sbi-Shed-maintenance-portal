const { importMasterWorkbook } = require("./lib/importMasterWorkbook");

importMasterWorkbook({
    filePath: "Project Documents/MASTER/Supervisor Master.xlsx",
    table: "supervisor_master",
    fields: {
        name: "Name",
        designation: "Designation",
        department: "Department",
        section: "Section",
        role: "Role"
    },
    apply: process.argv.includes("--apply")
}).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
