const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// ================= MONGO =================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB bağlı"))
  .catch(err => console.log("MongoDB hata:", err));

const Message = mongoose.model("Message", {
  user: String,
  text: String,
  room: String,
  time: { type: Date, default: Date.now }
});

// ================= ONLINE USERS =================
let onlineUsers = {};

// ================= ROUTES =================
app.get("/", (req, res) => {
  res.send("GETTIC LIVE 🚀");
});

app.get("/messages/:room", async (req, res) => {
  try {
    const msgs = await Message.find({ room: req.params.room })
      .sort({ time: 1 })
      .limit(100);

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SOCKET =================
io.on("connection", (socket) => {

  console.log("SOCKET CONNECT:", socket.id);

  socket.on("login", (username) => {
    onlineUsers[socket.id] = username;
    io.emit("online users", Object.values(onlineUsers));
  });

  socket.on("join room", (room) => {
    socket.join(room);
    console.log("JOIN ROOM:", room);
  });

  socket.on("chat message", async (data) => {
    if (!data || !data.room) return;

    console.log("MSG:", data);

    const msg = new Message(data);
    await msg.save();

    io.to(data.room).emit("chat message", data);
  });

  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    io.emit("online users", Object.values(onlineUsers));
  });
});

// ================= START =================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server aktif:", PORT));
