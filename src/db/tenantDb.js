const mongoose = require("mongoose");
const { attachModels } = require("../services/attachModels");

const connections = {}; // cache tenant connections

async function getTenantConnection(society) {
  const societyId = society._id.toString();

  if (!connections[societyId]) {
    const conn = mongoose.createConnection(society.dbUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    conn.on("connected", () =>
      console.log(`Tenant DB connected: ${societyId}`),
    );
    conn.on("error", (err) =>
      console.error(`Tenant DB error (${societyId}):`, err),
    );

    connections[societyId] = {
      conn,
      models: attachModels(conn),
    };
  }

  return connections[societyId];
}

module.exports = { getTenantConnection };
