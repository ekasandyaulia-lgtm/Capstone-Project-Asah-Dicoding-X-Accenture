# MineOptimize - Value Chain Management System

<a name="readme-top"></a>

<div align="center">
  <h3>MineOptimize</h3>
  <p>Platform web berbasis AI untuk optimasi perencanaan tambang dan pengiriman batubara</p>
  <p>
    <a href="https://github.com/nikita74939/MineOptimize"><strong>Jelajahi Dokumentasi »</strong></a>
    <br />
    <a href="https://mineoptimize-production.up.railway.app">Lihat Demo</a>
  </p>
</div>

---

## Daftar Isi
<details>
  <summary>Daftar Isi</summary>
  <ol>
    <li><a href="#tentang-proyek">Tentang Proyek</a></li>
    <li><a href="#memulai">Memulai</a></li>
    <li><a href="#cara-menjalankan-aplikasi">Cara Menjalankan Aplikasi</a></li>
    <li><a href="#model-machine-learning">Model Machine Learning</a></li>
    <li><a href="#kontribusi">Kontribusi</a></li>
    <li><a href="#catatan">Catatan</a></li>
    <li><a href="#penutup">Penutup</a></li>
  </ol>
</details>

---

## Tentang Proyek
[![Screenshot Produk](https://drive.google.com/uc?export=view&id=1n9SZvu9sCD_FSp98hr23eHSLYJytJ9vk)](https://github.com/nikita74939/MineOptimize)

**Deskripsi Singkat:**
MineOptimize adalah aplikasi web berbasis AI untuk mengelola **value chain pertambangan batubara**. Menggabungkan:
- Dashboard analitik real-time
- Prediksi kapasitas produksi berbasis Machine Learning
- AI Assistant berbasis Google Gemini

**Keunggulan:**
- SPA cepat & responsive (desktop, tablet, mobile)
- RESTful API & modular JS
- JWT authentication & error handling
- Real-time data visualization (Chart.js)

**Dibangun Dengan:**
- **Frontend:** HTML5, TailwindCSS, JavaScript, Chart.js  
- **Backend:** Node.js, Express.js, PostgreSQL  
- **AI/ML:** Google Gemini, Python, Scikit-learn/TensorFlow  
- **Security:** JWT, bcrypt, localStorage  

**Fitur Utama:**
- Dashboard & Analytics
- Mining Plan Module (prediksi, WSI, rekomendasi)
- Shipping Plan Module (jadwal, ETA, risiko cuaca)
- AI Assistant (chatbot Google Gemini)
- User Management (role-based)
- UI/UX: Dark/Light mode, responsive, SPA cepat

**Alur Sistem Singkat:**
```
User → Frontend → Backend → ML/AI → Respon & Dashboard
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Memulai
#### 📥 Tautan Download proyek
Model pre-trained dapat diunduh dari sumber berikut:
* **Google Drive**:([https://drive.google.com/drive/folders/1Fs8FUHCvsKdrCRusV4K5cttyzxAvWKwc?usp=drive_link](https://drive.google.com/drive/folders/1jS1IVLCdxxq96QwqETfIypvZFFhejO0H?usp=drive_link))
### Prasyarat
- Node.js ≥16.x, npm  
- PostgreSQL ≥13.x  
- Python ≥3.8 (opsional untuk ML)  
- Git, VS Code  

### Instalasi
```bash
git clone https://github.com/nikita74939/MineOptimize.git
cd MineOptimize
npm install

# Setup database
psql -U postgres -c "CREATE DATABASE mineoptimize_db;"
psql -U postgres -d mineoptimize_db -f database/schema.sql

# Copy .env
cp .env.example .env
```

### Konfigurasi Environment
```env
PORT=5000
DB_HOST=localhost
DB_NAME=mineoptimize_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
GEMINI_API_KEY=your_api_key
ML_MODEL_PATH=./models/mining_model.pkl
ML_MODEL_ENABLED=true
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Model Machine Learning
**Struktur Folder:**
```
models/
├── mining_cargo_rf.onnx
├── shipping_simulation_rf.onnx
```

**Verifikasi Model:**
```python
import onnxruntime as ort

mining_model = ort.InferenceSession('models/mining_cargo_rf.onnx')
shipping_model = ort.InferenceSession('models/shipping_simulation_rf.onnx')
print("✅ Models loaded successfully!")
```

**Integrasi ML ke Backend:**
- Opsi 1: Direct Python script  
- Opsi 2: Separate ML API (Flask/FastAPI)  

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Cara Menjalankan Aplikasi
```bash
npm start       # Backend
npm run dev     # Dev mode
# Buka di browser
http://localhost:5000
```

**Login Default:**
| Role | Username | Password | Akses |
|------|----------|----------|-------|
| Admin | admin | admin | Full |
| Mining Planner | mining | mining | Mining + Dashboard |
| Shipping Planner | shipping | shipping | Shipping + Dashboard |
| Viewer | viewer | viewer | Dashboard only |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Kontribusi
Terima kasih kepada tim kontributor:
- [ekasandyaulia-lgtm](https://github.com/ekasandyaulia-lgtm)  
- [fadliindra](https://github.com/fadliindra)  
- [Son0fGuilliman](https://github.com/Son0fGuilliman)  
- [nikita74939](https://github.com/nikita74939)  
- [akfalnasrullah](https://github.com/akfalnasrullah)  

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Catatan
- Pastikan backend & database berjalan sebelum mengakses aplikasi  
- Project dijalankan lokal, deployment publik opsional  

---

## Penutup
MineOptimize adalah **capstone project Asah Dicoding x Accenture**, yang dipersembahkan oleh **Tim ID Tim Capstone Project	: A25-CS125** menunjukkan kemampuan backend, database, AI & ML dalam satu aplikasi terintegrasi.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
