const bcrypt = require("bcrypt");

async function run() {
  const hash = await bcrypt.hash("SuperPassword123", 10);
  console.log(hash);
}

run();
