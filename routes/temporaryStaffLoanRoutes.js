const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");

function sameText(left, right) {
    return String(left || "").trim().toLowerCase() ===
        String(right || "").trim().toLowerCase();
}

async function getSupervisor(supervisorId) {
    const { data, error } = await supabase
        .from("supervisor_master")
        .select("id,department,section")
        .eq("id", supervisorId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

// ======================================================
// TEMPORARY STAFF LOANS FOR THE SELECTED DATE
// ======================================================

router.get("/temporary-loans", async (req, res) => {
    try {
        const loanDate = String(req.query.loan_date || "").trim();
        const supervisorId = Number(req.query.supervisor_id);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(loanDate) || !supervisorId) {
            return res.status(400).json({
                success: false,
                message: "A valid loan date and supervisor are required."
            });
        }

        const supervisor = await getSupervisor(supervisorId);
        if (!supervisor) {
            return res.status(404).json({
                success: false,
                message: "Supervisor was not found."
            });
        }

        const [loanResult, employeeResult, sectionResult] = await Promise.all([
            supabase
                .from("temporary_staff_loans")
                .select("id,staff_id,loan_date,department,from_section,to_section")
                .eq("loan_date", loanDate)
                .ilike("department", supervisor.department),
            supabase
                .from("employee_master")
                .select("id,name,designation,department,section")
                .ilike("department", supervisor.department)
                .order("name", { ascending: true }),
            supabase
                .from("supervisor_master")
                .select("section")
                .ilike("department", supervisor.department)
        ]);

        const error = loanResult.error || employeeResult.error || sectionResult.error;
        if (error) throw error;

        const employeeMap = new Map(
            (employeeResult.data || []).map(item => [Number(item.id), item])
        );
        const loans = (loanResult.data || []).map(item => ({
            ...item,
            staff_name: employeeMap.get(Number(item.staff_id))?.name || "Staff"
        }));
        const ownSection = supervisor.section;
        const permanentStaff = (employeeResult.data || []).filter(item =>
            sameText(item.section, ownSection) &&
            !["SSE", "JE"].includes(
                String(item.designation || "").trim().toUpperCase()
            )
        );
        const loanedOutIds = new Set(
            loans.filter(item => sameText(item.from_section, ownSection))
                .map(item => Number(item.staff_id))
        );
        const sections = [...new Set(
            (sectionResult.data || [])
                .map(item => String(item.section || "").trim())
                .filter(section => section && !sameText(section, ownSection))
        )].sort((a, b) => a.localeCompare(b));

        res.json({
            success: true,
            loan_date: loanDate,
            section: ownSection,
            loaned_in: loans.filter(item => sameText(item.to_section, ownSection)),
            loaned_out: loans.filter(item => sameText(item.from_section, ownSection)),
            staff_for_loan: permanentStaff.filter(item =>
                !loanedOutIds.has(Number(item.id))
            ),
            destination_sections: sections
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post("/temporary-loans", async (req, res) => {
    try {
        const loanDate = String(req.body.loan_date || "").trim();
        const supervisorId = Number(req.body.supervisor_id);
        const staffId = Number(req.body.staff_id);
        const toSection = String(req.body.to_section || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(loanDate) ||
            !supervisorId || !staffId || !toSection) {
            return res.status(400).json({
                success: false,
                message: "Staff, destination section and loan date are required."
            });
        }

        const [supervisor, employeeResult] = await Promise.all([
            getSupervisor(supervisorId),
            supabase.from("employee_master")
                .select("id,name,department,section")
                .eq("id", staffId)
                .maybeSingle()
        ]);
        if (employeeResult.error) throw employeeResult.error;
        const employee = employeeResult.data;
        if (!supervisor || !employee ||
            !sameText(employee.department, supervisor.department) ||
            !sameText(employee.section, supervisor.section)) {
            return res.status(403).json({
                success: false,
                message: "Only staff from your own section can be loaned out."
            });
        }
        if (sameText(toSection, supervisor.section)) {
            return res.status(400).json({
                success: false,
                message: "Loan destination must be another section."
            });
        }

        const { data: destinations, error: destinationError } = await supabase
            .from("supervisor_master")
            .select("section")
            .ilike("department", supervisor.department);
        if (destinationError) throw destinationError;
        const validDestination = (destinations || []).some(item =>
            sameText(item.section, toSection)
        );
        if (!validDestination) {
            return res.status(400).json({
                success: false,
                message: "Selected destination section is not valid."
            });
        }

        const { data: existingWork, error: workError } = await supabase
            .from("manpower_distribution")
            .select("id")
            .eq("staff_id", staffId)
            .eq("assigned_date", loanDate)
            .limit(1);
        if (workError) throw workError;
        if ((existingWork || []).length) {
            return res.status(409).json({
                success: false,
                message:
                    "This staff member already has work assigned for the selected date."
            });
        }

        const { data, error } = await supabase
            .from("temporary_staff_loans")
            .insert([{
                staff_id: staffId,
                loan_date: loanDate,
                department: supervisor.department,
                from_section: supervisor.section,
                to_section: toSection,
                created_by: supervisorId
            }])
            .select("id,staff_id,loan_date,from_section,to_section")
            .single();
        if (error) {
            return res.status(error.code === "23505" ? 409 : 500).json({
                success: false,
                message: error.code === "23505"
                    ? "This staff member already has a loan entry for the selected date."
                    : error.message
            });
        }

        res.status(201).json({
            success: true,
            message: "Temporary staff loan saved.",
            loan: { ...data, staff_name: employee.name }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

// ======================================================
// GET STAFF ALREADY ASSIGNED ON A WORK DATE
// ======================================================
