const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.get("/", (req, res) => {
  res.send("gettic backend çalışıyor");
});

io.on("connection", (socket) => {
  console.log("Bağlandı:", socket.id);

  socket.on("chat message", (data) => {
  io.emit("chat message", data);
});

  socket.on("disconnect", () => {
    console.log("Ayrıldı:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server aktif:", PORT));
