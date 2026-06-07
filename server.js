const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Data storage ─────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');

// ── Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ── Helpers ──────────────────────────────────────────────────────────
function load() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
  catch (e) { return {}; }
}
function save(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data));
}

function getUser(token) {
  if (!token) return null;
  const users = load();
  return Object.values(users).find(u => u.tokens && u.tokens.includes(token)) || null;
}

// ── Routes ────────────────────────────────────────────────────────────

app.post('/api/signup', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ error: 'Choose a username' });
  const uname = username.trim().toLowerCase();
  if (!uname) return res.json({ error: 'Choose a username' });
  const users = load();
  if (users[uname]) return res.json({ error: 'Username already taken' });
  const token = 'local_' + uname + '_' + crypto.randomBytes(8).toString('hex');
  users[uname] = {
    username: username.trim(),
    password,
    tokens: [token],
    db: { songs: [], playlists: [], albums: [], liked: {}, bg: '', homeConfig: null }
  };
  save(users);
  console.log('Signup:', uname);
  res.json({ token, username: username.trim() });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ error: 'Wrong username or password' });
  const uname = username.trim().toLowerCase();
  const users = load();
  if (!users[uname]) return res.json({ error: 'Wrong username or password' });
  if (users[uname].password !== password) return res.json({ error: 'Wrong username or password' });
  const token = 'local_' + uname + '_' + crypto.randomBytes(8).toString('hex');
  if (!users[uname].tokens) users[uname].tokens = [];
  users[uname].tokens.push(token);
  if (users[uname].tokens.length > 10) users[uname].tokens = users[uname].tokens.slice(-10);
  save(users);
  console.log('Login:', uname);
  res.json({ token, username: users[uname].username, db: users[uname].db || null });
});

app.post('/api/logout', (req, res) => {
  const token = req.headers['x-vibe-token'] || (req.body && req.body.token);
  if (token) {
    const users = load();
    for (const u of Object.values(users)) {
      if (u.tokens) u.tokens = u.tokens.filter(t => t !== token);
    }
    save(users);
  }
  res.json({ ok: true });
});

app.get('/api/db', (req, res) => {
  const token = req.headers['x-vibe-token'];
  const user = getUser(token);
  if (!user) return res.json({ songs: [], playlists: [], albums: [], liked: {}, bg: '', homeConfig: null });
  res.json(user.db || { songs: [], playlists: [], albums: [], liked: {}, bg: '', homeConfig: null });
});

app.post('/api/db', (req, res) => {
  const token = req.headers['x-vibe-token'];
  const user = getUser(token);
  if (!user) return res.json({ ok: true });
  const users = load();
  const uname = user.username.toLowerCase();
  if (users[uname]) {
    users[uname].db = req.body;
    save(users);
  }
  res.json({ ok: true });
});

app.post('/api/change-password', (req, res) => {
  const token = req.headers['x-vibe-token'];
  const user = getUser(token);
  if (!user) return res.json({ error: 'Not logged in' });
  const { oldPassword, newPassword } = req.body || {};
  const users = load();
  const uname = user.username.toLowerCase();
  if (!users[uname] || users[uname].password !== oldPassword) {
    return res.json({ error: 'Wrong current password' });
  }
  users[uname].password = newPassword;
  save(users);
  res.json({ ok: true });
});

app.get('/api/ping', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log('VIBE server on port', PORT);
  console.log('Data:', USERS_FILE);
});
