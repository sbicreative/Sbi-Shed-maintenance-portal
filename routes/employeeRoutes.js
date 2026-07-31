const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");

// =============================================
// GET EMPLOYEES
// =============================================

router.get("/", async (req, res) => {

    try {

        const department =
            String(req.query.department || "").trim();

        const section =
            String(req.query.section || "").trim();

        if (!department || !section) {

            return res.status(400).json({
                success: false,
                message:
                    "Department and section are required."
            });

        }

        let query = supabase

            .from("employee_master")

            .select(`
                id,
                name,
                designation,
                department,
                section
            `)

            .ilike("department", department)

            .ilike("section", section)

            .order("name", {
                ascending: true
            });

        const { data, error } = await query;

        if (error) {

            return res.status(500).json({

                success: false,
                message: error.message

            });

        }

        const staff =
            (data || []).filter(employee => {

                const designation =
                    String(
                        employee.designation || ""
                    )
                    .trim()
                    .toUpperCase();

                return ![
                    "SSE",
                    "JE"
                ].includes(designation);

            });

        res.json(staff);

    }

    catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

});

module.exports = router;
