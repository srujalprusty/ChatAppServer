const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid"); // Generate unique IDs

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let rooms = {}; // Store room users

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Create a room with a unique ID
    socket.on("createRoom", (callback) => {
        const roomId = uuidv4(); // Generate unique room ID
        rooms[roomId] = [];
        callback(roomId); // Send room ID back to the client
    });

    // Join an existing room
    socket.on("joinRoom", ({ roomId, username }) => {
        if (rooms[roomId]) {
            rooms[roomId].push(username);
            socket.join(roomId);
            io.to(roomId).emit("roomUsers", rooms[roomId]); // Notify users
        } else {
            socket.emit("error", "Room does not exist!");
        }
    });

    // Handle sending messages in rooms
    socket.on("sendRoomMessage", ({ roomId, sender, message }) => {
        io.to(roomId).emit("receiveRoomMessage", { sender, message });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        Object.keys(rooms).forEach(roomId => {
            rooms[roomId] = rooms[roomId].filter(user => user !== socket.id);
            if (rooms[roomId].length === 0) delete rooms[roomId];
        });
    });
});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});
