import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";              // <--- TAMBAHAN 1
import { fileURLToPath } from "url";  // <--- TAMBAHAN 2
import pool from "./src/config/db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import indexRoutes from "./src/routes/index.js";

dotenv.config();

// --- KONFIGURASI PATH ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -----------------------------------------------------

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- PENTING: SAJIKAN FRONTEND (FOLDER PUBLIC) ---
// Pastikan folder 'public' ada di sebelah file server.js
app.use(express.static(path.join(__dirname, 'public')));
// ------------------------------------------------

// Register API Routes
app.use("/api", indexRoutes);

// --- FALLBACK ROUTE ---
// Jika user buka halaman yang tidak ada di API, kirimkan index.html (Frontend)
app.get('*', (req, res) => {
    // Jangan tangkap request API
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API Not Found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cek koneksi DB
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch(err => console.error("❌ PostgreSQL Error:", err.message));

const PORT = process.env.PORT || 5000;
  
app.listen(PORT, (err) => {
    if (err) {
      console.error("❌ Server Error:", err.message);
      process.exit(1);
    } else {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const askGemini = async (prompt) => {
  const model = "gemini-2.5-flash"; 
  const res = await genAI.getGenerativeModel({ model }).generateContent(prompt);
  return res.response.text();
};