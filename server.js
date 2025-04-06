const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid"); // For generating unique room IDs

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let rooms = {}; // { roomId: [username1, username2, ...] }
let userMap = {}; // { socket.id: { username, roomId } }

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Create a new room and return its ID
    socket.on("createRoom", (callback) => {
        const roomId = uuidv4(); // Generate unique room ID
        rooms[roomId] = [];
        callback(roomId); // Send room ID to client
    });

    // User joins a room
    socket.on("joinRoom", ({ roomId, username }) => {
        if (rooms[roomId]) {
            rooms[roomId].push(username);
            userMap[socket.id] = { username, roomId };

            socket.join(roomId);
            console.log(`${username} joined room ${roomId}`);

            io.to(roomId).emit("roomUsers", rooms[roomId]); // Broadcast updated user list
        } else {
            socket.emit("error", "Room does not exist!");
        }
    });

    // User sends a message to a room
    socket.on("sendRoomMessage", ({ roomId, sender, message }) => {
        io.to(roomId).emit("receiveRoomMessage", { sender, message });
    });

    // Client requests the current user list in a room
    socket.on("getUsers", (roomId, callback) => {
        if (rooms[roomId]) {
            callback(rooms[roomId]);
        } else {
            callback([]);
        }
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
        const userInfo = userMap[socket.id];
        if (userInfo) {
            const { username, roomId } = userInfo;

            if (rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter(user => user !== username);

                if (rooms[roomId].length === 0) {
                    delete rooms[roomId];
                } else {
                    io.to(roomId).emit("roomUsers", rooms[roomId]);
                }
            }

            delete userMap[socket.id];
            console.log(`${username} disconnected from room ${roomId}`);
        }
    });
});

server.listen(3000, () => {
    console.log("🚀 Server running on port 3000");
});
