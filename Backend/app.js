import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authroutes.js';
import doctorRoutes from "./routes/doctorroutes.js";
import http from 'http';
import { initializeWebSocket } from './server/websocket.js';
import chatRoutes from './routes/chat.js';

dotenv.config();

const app = express();

// CORS Configuration - Shared between Express and Socket.IO
const corsOptions = {
  origin: [
    'http://localhost:3000',  // React dev server (if you use this)
    'http://localhost:5173',  // Vite dev server (your current frontend)
    'http://localhost:5174',  // Alternative Vite port
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket with the SAME CORS options
const io = initializeWebSocket(server, corsOptions);

// Add io to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Database connection
const databaseUrl = process.env.MONGO_URI;

mongoose
  .connect(databaseUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "medichain"  
  })
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 5000;

// Use server.listen instead of app.listen for WebSocket support
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for origins: ${corsOptions.origin.join(', ')}`);
  console.log(`WebSocket server initialized with CORS support`);
});