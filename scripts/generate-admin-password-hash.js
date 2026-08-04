const crypto = require("crypto");
const password = process.argv[2];
if (!password || password.length < 12) {
    console.error("Usage: node scripts/generate-admin-password-hash.js \"strong-password-of-12+-chars\"");
    process.exit(1);
}
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(password, salt, 64).toString("hex");
console.log(`scrypt$${salt}$${hash}`);
