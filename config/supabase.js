const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    "https://xocfcimdpbngmprfuafj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvY2ZjaW1kcGJuZ21wcmZ1YWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0ODg5MjMsImV4cCI6MjA5OTA2NDkyM30.ges9-4pAwK3gD_VYdQ52E3Wt6vFg3IkKBVA1QO7VZAA"
);

module.exports = supabase;