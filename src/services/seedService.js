/**
 * No automatic seed / wipe.
 * Create users manually in MySQL when needed.
 */
async function seedDemoData() {
  console.log("Seed skipped: no dummy data. Create users manually in MySQL.");
}

module.exports = { seedDemoData };
