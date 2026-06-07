const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Directories ──────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

[DATA_DIR, UPLOADS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');

// ── Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve uploaded audio files
app.use('/files', express.static(UPLOADS_DIR));

// Serve the frontend (index.html) from root
app.use(express.static(__dirname));

// ── Multer — audio uploads up to 50MB ────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp3';
    cb(null, `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /audio\//i.test(file.mimetype) || /\.(mp3|ogg|wav|flac|aac|m4a|webm)$/i.test(file.originalname);
    cb(null, ok);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────
function loadUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
  catch { return {}; }
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function makeToken() { return crypto.randomBytes(32).toString('hex'); }

// ── Auth middleware — checks token stored in users.json (survives restarts) ──
function auth(req, res, next) {
  const token = req.headers['x-vibe-token'];
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  const users = loadUsers();
  // Find which user owns this token
  const entry = Object.values(users).find(u => u.tokens && u.tokens.includes(token));
  if (!entry) return res.status(401).json({ error: 'Session expired — please log in again' });
  req.username = entry.username;
  next();
}

// ── Auth routes ───────────────────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const u = username.trim().toLowerCase();
  if (u.length < 2) return res.status(400).json({ error: 'Username too short' });
  const users = loadUsers();
  if (users[u]) return res.status(409).json({ error: 'Username taken' });
  const hash = await bcrypt.hash(password, 10);
  const token = makeToken();
  users[u] = {
    username: u,
    hash,
    tokens: [token],
    db: { songs: [], playlists: [], albums: [], liked: {}, bg: '', homeConfig: null }
  };
  saveUsers(users);
  res.json({ token, username: u });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const u = username.trim().toLowerCase();
  const users = loadUsers();
  if (!users[u]) return res.status(401).json({ error: 'Account not found' });
  const ok = await bcrypt.compare(password, users[u].hash);
  if (!ok) return res.status(401).json({ error: 'Wrong password' });
  const token = makeToken();
  // Keep up to 10 active tokens (one per device), drop oldest if over limit
  if (!users[u].tokens) users[u].tokens = [];
  users[u].tokens.push(token);
  if (users[u].tokens.length > 10) users[u].tokens = users[u].tokens.slice(-10);
  saveUsers(users);
  res.json({ token, username: u, db: users[u].db });
});

app.post('/api/logout', auth, (req, res) => {
  const token = req.headers['x-vibe-token'];
  const users = loadUsers();
  const u = users[req.username];
  if (u && u.tokens) u.tokens = u.tokens.filter(t => t !== token);
  saveUsers(users);
  res.json({ ok: true });
});

app.post('/api/change-password', auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const users = loadUsers();
  const u = users[req.username];
  const ok = await bcrypt.compare(oldPassword, u.hash);
  if (!ok) return res.status(401).json({ error: 'Wrong current password' });
  u.hash = await bcrypt.hash(newPassword, 10);
  saveUsers(users);
  res.json({ ok: true });
});

// ── DB save/load ──────────────────────────────────────────────────────
app.get('/api/db', auth, (req, res) => {
  const users = loadUsers();
  const u = users[req.username];
  res.json(u ? u.db : { songs: [], playlists: [], albums: [], liked: {}, bg: '', homeConfig: null });
});

app.post('/api/db', auth, (req, res) => {
  const users = loadUsers();
  if (!users[req.username]) return res.status(404).json({ error: 'User not found' });
  const incoming = req.body;
  if (incoming.songs) {
    incoming.songs = incoming.songs.map(s => {
      if (s.src && s.src.startsWith('data:')) {
        return { ...s, src: '', _missing: true };
      }
      return s;
    });
  }
  users[req.username].db = incoming;
  saveUsers(users);
  res.json({ ok: true });
});

// ── File upload ───────────────────────────────────────────────────────
app.post('/api/upload', auth, upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file' });
  const url = `/files/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, size: req.file.size });
});

// ── Delete a file ─────────────────────────────────────────────────────
app.delete('/api/file/:filename', auth, (req, res) => {
  const fn = path.basename(req.params.filename);
  const fp = path.join(UPLOADS_DIR, fn);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ ok: true });
});

// ── Health check ──────────────────────────────────────────────────────
app.get('/api/ping', (req, res) => res.json({ ok: true, time: Date.now() }));

// ── Start ─────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`VIBE server running on port ${PORT}`));
