const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ======================
// MONGODB BAĞLANTI
// ======================
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("MongoDB bağlı");
}).catch(err => {
  console.log("MongoDB hata:", err);
});

// ======================
// MESSAGE MODEL
// ======================
const Message = mongoose.model("Message", {
  user: String,
  text: String,
  room: String,
  time: { type: Date, default: Date.now }
});

// ======================
// TEST ROUTE
// ======================
app.get("/", (req, res) => {
  res.send("Gettic backend çalışıyor 🚀");
});

// ======================
// MESAJ GEÇMİŞİ API
// ======================
app.get("/messages/:room", async (req, res) => {
  try {
    const msgs = await Message.find({ room: req.params.room })
      .sort({ time: 1 })
      .limit(100);

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: "server error" });
  }
});

// ======================
// SOCKET.IO
// ======================
io.on("connection", (socket) => {
  console.log("Bağlandı:", socket.id);

  // Odaya katıl
  socket.on("join room", (room) => {
    socket.join(room);
    console.log(`${socket.id} -> ${room}`);
  });

  // Mesaj gönder
  socket.on("chat message", async (data) => {
    if (!data || !data.room) return;

    // MongoDB'ye kaydet
    const msg = new Message({
      user: data.user,
      text: data.text,
      room: data.room
    });

    await msg.save();

    // herkese yayınla
    io.to(data.room).emit("chat message", data);
  });

  socket.on("disconnect", () => {
    console.log("Ayrıldı:", socket.id);
  });
});

// ======================
// SERVER START
// ======================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server aktif:", PORT);
});
