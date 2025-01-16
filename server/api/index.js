
import { Server } from "socket.io";
import { createServer } from "http";

export default (req, res) => {
  // Create HTTP server and socket.io server
  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Socket.IO server running');
  });

  const io = new Server(server, {
    cors: {
      origin: "https://webrtc-123.vercel.app", // Specify your frontend URL here
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
    },
  });
 
  // Maps to track connections
  const emailToSocketIdMap = new Map();
  const socketidToEmailMap = new Map();

  io.on("connection", (socket) => {
    console.log(`Socket Connected: ${socket.id}`);
    
    socket.on("room:join", (data) => {
      const { email, room } = data;
      emailToSocketIdMap.set(email, socket.id);
      socketidToEmailMap.set(socket.id, email);
      io.to(room).emit("user:joined", { email, id: socket.id });
      socket.join(room);
      io.to(socket.id).emit("room:join", data);
    });

    socket.on("user:call", ({ to, offer }) => {
      io.to(to).emit("incomming:call", { from: socket.id, offer });
    });

    socket.on("call:accepted", ({ to, ans }) => {
      io.to(to).emit("call:accepted", { from: socket.id, ans });
    });

    socket.on("peer:nego:needed", ({ to, offer }) => {
      console.log("peer:nego:needed", offer);
      io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
    });

    socket.on("peer:nego:done", ({ to, ans }) => {
      console.log("peer:nego:done", ans);
      io.to(to).emit("peer:nego:final", { from: socket.id, ans });
    });
    
    socket.on("disconnect", () => {
      const email = socketidToEmailMap.get(socket.id);
      if (email) {
        emailToSocketIdMap.delete(email);
        socketidToEmailMap.delete(socket.id);
      }
      console.log(`Socket Disconnected: ${socket.id}`);
    });
  });

  // Vercel serverless function needs a response
  server.listen(8000, () => {
    console.log("Socket.IO server is running on port 8000");
  });

  res.status(200).send("Socket.IO server running");
};
