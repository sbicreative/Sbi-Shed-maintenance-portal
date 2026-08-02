const express = require("express");
const path = require("path");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

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

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "sbi-shed-maintenance-portal",
        uptime_seconds: Math.floor(process.uptime())
    });
});


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
    "/api/employees",
    employeeRoutes
);

// ======================================================
// HOME PAGE
// ======================================================

app.get("/", (req, res) => {
    res.redirect(302, "/portal.html");

});


// ======================================================
// SERVER START
// ======================================================

const PORT = Number(process.env.PORT) || 3000;

function startServer() {
    const server = app.listen(
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
            "======================================"
        );

        }
    );

    const shutdown = signal => {
        console.log(`${signal} received; closing HTTP server.`);
        server.close(error => {
            if (error) {
                console.error(error);
                process.exitCode = 1;
            }
        });
    };

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
    return server;
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
