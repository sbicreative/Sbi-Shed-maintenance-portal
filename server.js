const express = require("express");
const path = require("path");

const app = express();

// ======================================================
// ROUTES
// ======================================================

const authRoutes =
    require("./routes/authRoutes");

const departmentRoutes =
    require("./routes/departmentRoutes");

const locoRoutes =
    require("./routes/locoRoutes");

const scheduleRoutes =
    require("./routes/scheduleRoutes");

const supervisorRoutes =
    require("./routes/supervisorRoutes");

const workMasterRoutes =
    require("./routes/workMasterRoutes");

const assignWorkRoutes =
    require("./routes/assignWorkRoutes");

const manpowerRoutes =
    require("./routes/manpowerRoutes");
const scheduleFormRoutes =
    require("./routes/scheduleFormRoutes");
const locoHistoryRoutes =
    require("./routes/locoHistoryRoutes");
const trackingRoutes =
    require("./routes/trackingRoutes");
const historicalScheduleRoutes =
    require("./routes/historicalScheduleRoutes");
const chargeHandoverRoutes =
    require("./routes/chargeHandoverRoutes");
    const employeeRoutes =
require("./routes/employeeRoutes");


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// ======================================================
// STATIC FILES
// ======================================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ======================================================
// API ROUTES
// ======================================================

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api",
    departmentRoutes
);

app.use(
    "/api/locos",
    locoRoutes
);

app.use(
    "/api/schedules",
    scheduleRoutes
);

app.use(
    "/api/supervisors",
    supervisorRoutes
);

app.use(
    "/api/work-master",
    workMasterRoutes
);

app.use(
    "/api/assign-work",
    assignWorkRoutes
);

app.use(
    "/api/manpower-distribution",
    manpowerRoutes
);
app.use(
    "/api/schedule-forms",
    scheduleFormRoutes
);
app.use(
    "/api/loco-history",
    locoHistoryRoutes
);
app.use(
    "/api/tracking",
    trackingRoutes
);
app.use(
    "/api/historical-schedules",
    historicalScheduleRoutes
);
app.use(
    "/api/charge-handover",
    chargeHandoverRoutes
);
app.use(
    "/api/employees",
    employeeRoutes
);

// ======================================================
// HOME PAGE
// ======================================================

app.get("/", (req, res) => {

    res.sendFile(

        path.join(
            __dirname,
            "public",
            "portal.html"
        )

    );

});


// ======================================================
// SERVER START
// ======================================================

const PORT = Number(process.env.PORT) || 3000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "======================================"
        );

        console.log(
            "🚂 SBI SHED LOCO APP SERVER STARTED"
        );

        console.log(
            "======================================"
        );

        console.log(
            `Local   : http://localhost:${PORT}`
        );

        console.log(
            `Railnet : http://10.1.0.69:${PORT}`
        );

        console.log(
            "======================================"
        );

    }
);
