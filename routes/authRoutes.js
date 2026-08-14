const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");
const {
    normalizeMobileNumber,
    normalizeName,
    normalizePfNumber,
    normalizeText
} = require("../lib/masterIdentity");

async function resolveMasterMapping(user) {
    const role = normalizeText(user.role);
    const pfNo = normalizePfNumber(user.pf_no);
    const isSupervisor =
        role === "supervisor" || role === "incharge";
    const isStaff = role === "staff";

    if (!isSupervisor && !isStaff) {
        return {
            supervisor_master_id: null,
            employee_master_id: null
        };
    }

    if (!pfNo) {
        return {
            supervisor_master_id: null,
            employee_master_id: null
        };
    }

    const table =
        isSupervisor
            ? "supervisor_master"
            : "employee_master";

    let query = supabase
        .from(table)
        .select("id,pf_no")
        .eq("pf_no", pfNo);

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    const matches = data || [];

    if (matches.length !== 1) {
        return {
            supervisor_master_id: null,
            employee_master_id: null
        };
    }

    return isSupervisor
        ? {
            supervisor_master_id: matches[0].id,
            employee_master_id: null
        }
        : {
            supervisor_master_id: null,
            employee_master_id: matches[0].id
        };
}

// ======================================================
// EMPLOYEE REGISTRATION
// ======================================================

router.post("/register", async (req, res) => {

    try {

        const {
            name,
            mobile_no_cug,
            pf_no,
            department,
            section,
            designation,
            role
        } = req.body;

        const normalizedPf = normalizePfNumber(pf_no);

        if (!normalizedPf) {
            return res.status(400).json({
                success: false,
                message: "A valid PF Number is required."
            });
        }

        // Check Mobile Already Exists

        const { data: mobileExists, error: mobileError } = await supabase
            .from("user_master")
            .select("id")
            .eq("mobile_no_cug", mobile_no_cug);

        if (mobileError) {
            return res.json({
                success: false,
                message: mobileError.message
            });
        }

        if (mobileExists.length > 0) {
            return res.json({
                success: false,
                message: "Mobile Number already registered."
            });
        }

        // Check PF Already Exists

        const { data: pfExists, error: pfError } = await supabase
            .from("user_master")
            .select("id")
            .eq("pf_no", normalizedPf);

        if (pfError) {
            return res.json({
                success: false,
                message: pfError.message
            });
        }

        if (pfExists.length > 0) {
            return res.json({
                success: false,
                message: "PF Number already registered."
            });
        }

        const mapping = await resolveMasterMapping({
            pf_no: normalizedPf,
            role
        });

        const operationalRole = [
            "staff", "supervisor", "incharge"
        ].includes(normalizeText(role));

        if (
            operationalRole &&
            !mapping.supervisor_master_id &&
            !mapping.employee_master_id
        ) {
            return res.status(422).json({
                success: false,
                message:
                    "PF Number was not found in the relevant master. Ask Admin to update and import the master Excel first."
            });
        }

        // Insert User

        const { error } = await supabase
            .from("user_master")
            .insert([{
                name,
                mobile_no_cug,
                pf_no: normalizedPf,
                department,
                section,
                designation,
                role,
                ...mapping
            }]);

        if (error) {
            return res.json({
                success: false,
                message: error.message
            });
        }

        res.json({
            success: true,
            message: "Registration Successful."
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// ======================================================
// EMPLOYEE LOGIN
// ======================================================

router.post("/login", async (req, res) => {

    try {

        const {
            name,
            mobile_no_cug
        } = req.body;

        const normalizedName = normalizeName(name);
        const normalizedMobile =
            normalizeMobileNumber(mobile_no_cug);

        if (!normalizedName || normalizedMobile.length !== 10) {
            return res.status(400).json({
                success: false,
                message:
                    "Please enter a valid registered name and 10-digit mobile number."
            });
        }

        const { data, error } = await supabase
            .from("user_master")
            .select("*");

        if (error) {
            return res.json({
                success: false,
                message: error.message
            });
        }

        const matches = (data || []).filter(user =>
            normalizeName(user.name) === normalizedName &&
            normalizeMobileNumber(user.mobile_no_cug) ===
                normalizedMobile
        );

        if (matches.length === 0) {
            return res.json({
                success: false,
                message:
                    "Name or mobile number does not match a registered user."
            });
        }

        if (matches.length > 1) {
            return res.status(409).json({
                success: false,
                message:
                    "Multiple login records matched. Please contact Admin."
            });
        }

        let user = matches[0];

        const role = normalizeText(user.role);
        const needsSupervisorMapping =
            ["supervisor", "incharge"].includes(role) &&
            !user.supervisor_master_id;
        const needsEmployeeMapping =
            role === "staff" &&
            !user.employee_master_id;

        if (needsSupervisorMapping || needsEmployeeMapping) {
            const mapping = await resolveMasterMapping(user);
            const mappedId =
                mapping.supervisor_master_id ||
                mapping.employee_master_id;

            if (!mappedId) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Your login is not uniquely mapped with the relevant master record. Please contact Admin."
                });
            }

            const { data: updatedUser, error: updateError } =
                await supabase
                    .from("user_master")
                    .update(mapping)
                    .eq("id", user.id)
                    .select("*")
                    .single();

            if (updateError) {
                return res.status(500).json({
                    success: false,
                    message: updateError.message
                });
            }

            user = updatedUser;
        }

        if (
            normalizeText(user.role) === "supervisor" &&
            user.supervisor_master_id
        ) {
            const today = new Date().toLocaleDateString("en-CA", {
                timeZone: "Asia/Kolkata"
            });
            const { data: handovers, error: handoverError } =
                await supabase
                    .from("incharge_charge_handover")
                    .select(`
                        id,
                        permanent_incharge_id,
                        acting_incharge_id,
                        department,
                        start_date,
                        end_date,
                        reason
                    `)
                    .eq(
                        "acting_incharge_id",
                        user.supervisor_master_id
                    )
                    .eq("status", "Active")
                    .lte("start_date", today)
                    .gte("end_date", today)
                    .limit(1);

            if (!handoverError && handovers?.length) {
                user = {
                    ...user,
                    permanent_role: user.role,
                    role: "incharge",
                    acting_charge: true,
                    acting_for_incharge_id:
                        handovers[0].permanent_incharge_id,
                    charge_handover: handovers[0]
                };
            }
        }

let dashboard = "";
const dashboardRole = String(user.role || "")
    .trim()
    .toLowerCase();

switch (dashboardRole) {

    case "admin":
        dashboard = "/dashboard/admin.html";
        break;

    case "incharge":
        dashboard = "/dashboard/incharge.html";
        break;

    case "supervisor":
        dashboard = "/dashboard/supervisor.html";
        break;

    case "staff":
        dashboard = "/dashboard/staff.html";
        break;

    case "viewer":
        dashboard = "/dashboard/viewer.html";
        break;

    case "officers":
        dashboard = "/dashboard/viewer.html";   // Filhal Officer Viewer page use karega
        break;

    default:
        dashboard = "/dashboard/login.html";
}

res.json({

    success: true,

    user,

    dashboard

});

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

module.exports = router;
