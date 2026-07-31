const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const supabase = require("./config/supabase");

const masterRoot = path.join(
    __dirname,
    "Project Documents",
    "MASTER"
);

const templates = [
    {
        code: "EL_AUXILIARY_MACHINE",
        name: "Auxiliary Machines Schedule",
        section: "EL",
        file: path.join(
            "El schedule form",
            "Auxiliary machine schedule form_IA_IB_IC.docx"
        ),
        workNames: [
            "AUXILIARY MACHINE SCH & GREASING"
        ]
    },
    {
        code: "EL_CAB1_SB1_HB1",
        name: "Cab-1, SB-1 and HB-1 Schedule",
        section: "EL",
        file: path.join(
            "El schedule form",
            "Cab1_SB1_HB1 schedule form_IA_IB_IC.docx"
        ),
        workNames: [
            "CAB#1, HB#1, SB#1 SCH WORK"
        ]
    },
    {
        code: "EL_CAB2_SB2_HB2",
        name: "Cab-2, SB-2 and HB-2 Schedule",
        section: "EL",
        file: path.join(
            "El schedule form",
            "Cab2_SB2_HB2 schedule form_IA_IB_IC.docx"
        ),
        workNames: [
            "CAB#2, HB#2, SB#2 SCH WORK"
        ]
    },
    {
        code: "EL_HLC",
        name: "Hotel Load Converter Schedule",
        section: "EL",
        file: path.join(
            "El schedule form",
            "HLCs - IA_IB_IC Scheduel for final.docx"
        ),
        workNames: [
            "HOTEL LOAD CONVERTER SCH"
        ]
    },
    {
        code: "EL_SR_BUR",
        name: "SR and BUR Schedule",
        section: "EL",
        file: path.join(
            "El schedule form",
            "SR and BUR schedule form_IA_IB_IC.docx"
        ),
        workNames: [
            "TRACTION CONVERTER & AUX. CONVERTER SCH"
        ]
    },
    {
        code: "EL_TM",
        name: "Traction Motor Schedule",
        section: "EL",
        file: path.join(
            "El schedule form",
            "TM schedule form_IA_IB_IC.docx"
        ),
        workNames: [
            "TM SCH & GREASING"
        ]
    },
    {
        code: "EL_WATERLESS_URINAL",
        name: "Waterless Urinal Schedule",
        section: "EL",
        file: path.join(
            "El schedule form",
            "Waterless Urinal Schedule form.docx"
        ),
        workNames: [
            "WATER LESS URINAL SCH"
        ],
        scheduleTypes: ["TI", "IA", "IB", "IC"]
    },
    {
        code: "EL_KAVACH",
        name: "Onboard KAVACH Maintenance Schedule",
        section: "EL",
        file: path.join(
            "El schedule form",
            "Scheduled Maintenance activities for onboard KAVACH_IA_IB_IC.pdf"
        ),
        workNames: [
            "KAVACH SCH"
        ],
        sourceType: "pdf"
    },
    {
        code: "ML_INCOMING",
        name: "Mechanical Incoming Inspection",
        section: "ML",
        file: path.join(
            "ML schedule form",
            "1. ML-3Phase WAG9 IAIBIC Schedule [ Incoming].docx"
        ),
        workNames: ["IRC"]
    },
    {
        code: "ML_FINAL",
        name: "Mechanical Final Inspection",
        section: "ML",
        file: path.join(
            "ML schedule form",
            "1. ML-3Phase WAG9 IAIBIC Schedule [ Final].docx"
        ),
        workNames: [
            "FRC AND REPAIRS",
            "FINAL RUNNING CHECK (FRC)"
        ]
    },
    {
        code: "ML_UNDERFRAME_1",
        name: "Mechanical Underframe-I Schedule",
        section: "ML",
        file: path.join(
            "ML schedule form",
            "2. ML-3Phase WAG9 IAIBIC Schedule [Under Frame-I].docx"
        ),
        workNames: ["UNDERFRAME (I)"]
    },
    {
        code: "ML_UNDERFRAME_2",
        name: "Mechanical Underframe-II Schedule",
        section: "ML",
        file: path.join(
            "ML schedule form",
            "2. ML-3Phase WAG9 IAIBIC Schedule [Under Frame-II].docx"
        ),
        workNames: ["UNDERFRAME ( II)"]
    },
    {
        code: "ML_COMPRESSOR_PNEUMATIC",
        name: "Compressor and Pneumatic System Schedule",
        section: "ML",
        file: path.join(
            "ML schedule form",
            "3. ML-3Phase WAG9 IAIBIC Schedule [Compressor& Pneumatic].docx"
        ),
        workNames: [
            "COMPRESSOR( I,)",
            "COMPRESSOR(  II,)"
        ]
    },
    {
        code: "ML_PANTOGRAPH",
        name: "Pantograph Schedule",
        section: "ML",
        file: path.join(
            "ML schedule form",
            "4. ML-3Phase WAG9 IAIBIC Schedule [ PANTOGRAPH ].docx"
        ),
        workNames: ["PANTO SCHEDULE"]
    },
    {
        code: "ML_CARBODY",
        name: "Carbody Schedule",
        section: "ML",
        file: path.join(
            "ML schedule form",
            "5. ML-3Phase WAG9 IAIBIC Schedule [  Carbody ].docx"
        ),
        workNames: ["CARBODY SCHEDULE"]
    },
    {
        code: "ML_OCB",
        name: "OCB Schedule",
        section: "ML",
        file: path.join(
            "ML schedule form",
            "5. ML-3Phase WAG9 IAIBIC Schedule [ OCB ].docx"
        ),
        workNames: ["OCB SCHEDULE"]
    },
    {
        code: "ML_VCB_TRANSFORMER",
        name: "VCB and Transformer Schedule",
        section: "ML",
        file: path.join(
            "ML schedule form",
            "6. ML-3Phase WAG9 IAIBIC Schedule [VCB and Transformer].docx"
        ),
        workNames: [
            "VCB SCHEDULE",
            "TRANSFORMER SCHEDULE"
        ]
    }
];

function normalizeText(value) {
    return String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim();
}

async function buildTemplateSchema(template, fullPath) {
    const sourceType =
        template.sourceType ||
        path.extname(fullPath).slice(1).toLowerCase();

    if (sourceType === "pdf") {
        return {
            format: "pdf_reference_v1",
            title: template.name,
            work_names: template.workNames,
            source_type: "pdf",
            document_html: "",
            notes:
                "PDF reference imported. Web fields will be configured separately."
        };
    }

    const result = await mammoth.convertToHtml(
        { path: fullPath },
        {
            includeDefaultStyleMap: true,
            ignoreEmptyParagraphs: false
        }
    );

    return {
        format: "document_html_v1",
        title: template.name,
        work_names: template.workNames,
        source_type: "docx",
        document_html: normalizeText(result.value),
        conversion_messages: result.messages.map(message => ({
            type: message.type,
            message: message.message
        }))
    };
}

async function resolveWorkMasterId(template) {
    const { data, error } = await supabase
        .from("work_master")
        .select("id,work_name")
        .in("work_name", template.workNames)
        .order("id", { ascending: true });

    if (error) throw error;

    const sectionMatches = (data || []).filter(work =>
        template.section === "ML"
            ? Number(work.id) >= 268
            : Number(work.id) < 268
    );

    const match = sectionMatches[0] || (data || [])[0];

    if (!match) {
        throw new Error(
            `No work_master mapping found for ${template.code}`
        );
    }

    return match.id;
}

async function saveTemplate(template) {
    const fullPath = path.join(masterRoot, template.file);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Source file not found: ${fullPath}`);
    }

    const templateSchema =
        await buildTemplateSchema(template, fullPath);
    const workMasterId =
        await resolveWorkMasterId(template);

    const record = {
        form_code: template.code,
        form_name: template.name,
        department_id:
            template.section === "ML" ? 2 : 1,
        section_id:
            template.section === "ML" ? 8 : 1,
        loco_type: "Electric",
        schedule_name: (
            template.scheduleTypes || ["IA", "IB", "IC"]
        ).join("/"),
        work_master_id: workMasterId,
        department:
            template.section === "ML"
                ? "Mechanical"
                : "Electrical",
        section: template.section,
        schedule_types:
            template.scheduleTypes || ["IA", "IB", "IC"],
        source_file_name: template.file,
        template_schema: templateSchema,
        version: 1,
        is_active: true
    };

    const { data: existing, error: findError } =
        await supabase
            .from("schedule_form_master")
            .select("id")
            .eq("form_code", template.code)
            .limit(1);

    if (findError) throw findError;

    let error;

    if (existing && existing.length > 0) {
        ({ error } = await supabase
            .from("schedule_form_master")
            .update(record)
            .eq("id", existing[0].id));
    } else {
        ({ error } = await supabase
            .from("schedule_form_master")
            .insert([record]));
    }

    if (error) throw error;

    console.log(
        `${existing?.length ? "UPDATED" : "IMPORTED"}: ` +
        `${template.code} - ${template.name}`
    );
}

async function importScheduleForms() {
    console.log(
        `Importing ${templates.length} schedule form templates...`
    );

    for (const template of templates) {
        await saveTemplate(template);
    }

    console.log("Schedule form master import completed.");
}

importScheduleForms().catch(error => {
    console.error(
        "Schedule form import failed:",
        error.message || error
    );
    process.exit(1);
});
