require("dotenv").config();

const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const app = require("./app");
const Society = require("./src/models/Society");

// create HTTP server
const server = http.createServer(app);


// attach socket
const io = new Server(server, {
  cors: { origin: "*" }
});


/* =================================================
   SOCKET AUTH (JWT + TENANT DB + MODELS)
================================================= */
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;

    // get society from master DB
    const society = await Society.findById(decoded.societyId).lean();

    if (!society) {
      return next(new Error("Society not found"));
    }

    // connect tenant DB
    const { getTenantConnection } = require("./src/db/tenantDb");
    const tenant = await getTenantConnection(society);

    socket.db = tenant.conn;
    socket.models = tenant.models;

    next();

  } catch (err) {
    console.error("Socket auth error:", err);
    next(new Error("Authentication failed"));
  }
});


/* =================================================
   SOCKET EVENTS
================================================= */
io.on("connection", (socket) => {

  console.log("User connected:", socket.user.id);


  /* -------------------------------
     Join complaint room
  --------------------------------*/
  socket.on("joinComplaint", (complaintId) => {
    socket.join(complaintId);
    console.log("Joined room:", complaintId);
  });


  /* -------------------------------
     Send message
  --------------------------------*/
  socket.on("sendMessage", async ({ complaintId, message }) => {

    if (!message?.trim()) return;

    try {
      const Comment = socket.models.ComplaintComment;

      const newMsg = await Comment.create({
        complaintId,
        message,
        createdBy: socket.user.id,
      });

      const populated = await newMsg.populate("createdBy", "name role");

      io.to(complaintId).emit("newMessage", populated);

    } catch (err) {
      console.error("SendMessage error:", err);
    }
  });


  /* -------------------------------
     Disconnect
  --------------------------------*/
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.user.id);
  });

  /* -------------------------------
   Typing indicator
--------------------------------*/
socket.on("typing", ({ complaintId, name }) => {
  socket.to(complaintId).emit("userTyping", {
    userId: socket.user.id,
    name,
  });
});

socket.on("stopTyping", ({ complaintId }) => {
  socket.to(complaintId).emit("userStoppedTyping", {
    userId: socket.user.id,
  });
});

});


/* =================================================
   START SERVER
================================================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});