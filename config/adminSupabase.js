const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL ||
    "https://xocfcimdpbngmprfuafj.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey && process.env.NODE_ENV === "production") {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not configured; protected admin database operations will be unavailable.");
}

const adminSupabase = createClient(
    supabaseUrl,
    serviceRoleKey || process.env.SUPABASE_ANON_KEY || "missing-service-role-key",
    { auth: { persistSession: false, autoRefreshToken: false } }
);

module.exports = adminSupabase;
