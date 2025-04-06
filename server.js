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
    console.log("🟢 New client connected:", socket.id);

    // 🔹 Create a room
    socket.on("createRoom", ({ roomId, user }) => {
        console.log("📥 Room creation requested by user:", user.username, "ID:", roomId);

        rooms[roomId] = [user.username];
        userMap[socket.id] = { username: user.username, roomId };

        socket.join(roomId);

        // ✅ Emit roomCreated event back to the same user
        socket.emit("roomCreated", roomId);

        // 🔄 Notify others in the room
        io.to(roomId).emit("roomUsers", rooms[roomId]);
    });

    // 🔹 Join a room
    socket.on("joinRoom", ({ roomId, username }) => {
        if (rooms[roomId]) {
            rooms[roomId].push(username);
            userMap[socket.id] = { username, roomId };

            socket.join(roomId);
            console.log(`✅ ${username} joined room ${roomId}`);

            io.to(roomId).emit("roomUsers", rooms[roomId]);
        } else {
            socket.emit("error", "Room does not exist!");
        }
    });

    // 🔹 Send a message to room
    socket.on("sendRoomMessage", ({ roomId, sender, message }) => {
        io.to(roomId).emit("receiveRoomMessage", { sender, message });
    });

    // 🔹 Get current users in a room
    socket.on("getUsers", (roomId, callback) => {
        if (rooms[roomId]) {
            callback(rooms[roomId]);
        } else {
            callback([]);
        }
    });

    // 🔹 Disconnect
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
            console.log(`🔴 ${username} disconnected from room ${roomId}`);
        }
    });
});

server.listen(3000, () => {
    console.log("🚀 Server running on port 3000");
});
