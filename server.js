const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows all clients to connect
  },
});

let users = []; // Stores connected users { id, name }

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // Handle user joining the chat
  socket.on("join", (username) => {
    if (!users.some(user => user.name === username)) {
      users.push({ id: socket.id, name: username });
      console.log(`👤 ${username} joined. Users online:`, users.map(u => u.name));
    }
    io.emit("userList", users.map(user => user.name)); // Send updated user list
  });

  // Handle sending messages
  socket.on("sendMessage", ({ sender, receiver, message }) => {
    console.log(`📩 Message from ${sender} to ${receiver}: ${message}`);

    const recipient = users.find(user => user.name === receiver);
    if (recipient) {
      io.to(recipient.id).emit("receiveMessage", { sender, message });
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    const disconnectedUser = users.find(user => user.id === socket.id);
    if (disconnectedUser) {
      console.log(`❌ User disconnected: ${disconnectedUser.name}`);
      users = users.filter(user => user.id !== socket.id);
      io.emit("userList", users.map(user => user.name)); // Update user list
    }
  });
});

server.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
