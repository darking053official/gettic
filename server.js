const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// test route
app.get("/", (req, res) => {
  res.send("Gettic backend çalışıyor 🚀");
});

// socket logic
io.on("connection", (socket) => {
  console.log("Bağlandı:", socket.id);

  // Odaya katıl
  socket.on("join room", (room) => {
    socket.join(room);
    console.log(`${socket.id} -> ${room} odasına girdi`);
  });

  // mesaj gönder
  socket.on("chat message", (data) => {
    /*
      data = {
        user: "isim",
        text: "mesaj",
        room: "genel"
      }
    */

    if (!data || !data.room) return;

    io.to(data.room).emit("chat message", {
      user: data.user,
      text: data.text,
      room: data.room
    });
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("Ayrıldı:", socket.id);
  });
});

// Render port fix
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server aktif:", PORT);
});
