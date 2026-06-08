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

// ── Starter songs ─────────────────────────────────────────────────────
const STARTER_SONGS = [
  { name: 'Broken Promises',                    file: 'Don_Toliver_-_Broken_Promises_-_eduh.mp3' },
  { name: 'Choose U',                           file: 'Don_Toliver_-_Choose_U_-_eduh.mp3' },
  { name: 'COLORZ',                             file: 'Don_Toliver_-_COLORZ_-_eduh.mp3' },
  { name: 'Dog Bone',                           file: 'Don_Toliver_-_Dog_Bone_-_eduh.mp3' },
  { name: 'Hellcat',                            file: 'Don_Toliver_-_Hellcat_-_eduh.mp3' },
  { name: "I'm The Problem",                    file: 'Don_Toliver_-_Im_The_Problem_-_eduh.mp3' },
  { name: 'Like U Work 4 Me',                   file: 'Don_Toliver_-_Like_U_Work_4_Me_-_eduh.mp3' },
  { name: 'Midas Touch',                        file: 'don_toliver_-_midas_touch_-_skai_.mp3' },
  { name: 'Old Don',                            file: 'Don_Toliver_-_Old_Don_-_Random_Track_Posts.mp3' },
  { name: 'Replay',                             file: 'Don_Toliver_-_Replay__Prod__Bugz_Ronin__-_Don_Toliver.mp3' },
  { name: 'Served Up',                          file: 'Don_Toliver_-_Served_Up__Unreleased__-_Little_Johnson.mp3' },
  { name: 'Streets Need Me',                    file: 'Don_Toliver_-_Streets_Need_Me_-_Don_Exclusives_V2.mp3' },
  { name: 'Tropic Thunder',                     file: 'Don_Toliver_-_Tropic_Thunder_-_luvrell.mp3' },
  { name: 'No Rest',                            file: 'Don_Toliver-_No_Rest_-_Don_Exclusives_V2.mp3' },
  { name: 'Plans (ft. 6lack)',                  file: 'Don_Toliver-_Plans_ft__6lack_-_Don_Exclusives.mp3' },
  { name: 'Ready to Go',                        file: 'Don_toliver_Ready_to_go___unreleased__-_Bandx.mp3' },
  { name: 'Blurred Lines',                      file: 'Don_Toliver-Blurred_Lines__Unreleased__-_Don_womack.mp3' },
  { name: 'I Tried',                            file: 'Don_Toliver-I_Tried__Unreleased__-_Don_womack.mp3' },
  { name: 'Ocean / Long Way to Calabasas OG',   file: 'Don_Toliver-Ocean_Long_Way_to_Calabasas_OG__Octane_Unreleased__-_Don_womack.mp3' },
  { name: 'The Point',                          file: 'Don_Toliver-The_Point_Unreleased__-_Don_womack.mp3' },
  { name: 'Faculty',                            file: 'Faculty_-_Don_Toliver__Unreleased__-_Leaked_Music.mp3' },
  { name: 'No Pole OG',                         file: 'No_Pole_OG_Don_Toliver_Leak_-_polosgwagon.mp3' },
  { name: 'On My Line',                         file: 'On_My_Line_-_Don_Toliver__unreleased__-_Don_Toliver.mp3' },
  { name: 'Outta My Mind',                      file: 'Don_Toliver_-_Outta_My_Mind_-_Sudsy.mp3' },
];

function makeStarterDB() {
  return {
    songs: STARTER_SONGS.map(function(s, i) {
      return {
        id: 'starter_' + i,
        name: s.name,
        artist: 'Don Toliver',
        src: '/public/' + s.file,
        thumb: '',
        dur: '—',
        type: 'url',
        added: Date.now() - (STARTER_SONGS.length - i) * 1000
      };
    }),
    playlists: [],
    albums: [],
    liked: {},
    bg: '',
    homeConfig: null
  };
}

// ── Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/files', express.static(UPLOADS_DIR));
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
  users[uname] = { username: username.trim(), password, tokens: [token], db: makeStarterDB() };
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
  res.json({ token, username: users[uname].username, db: users[uname].db || makeStarterDB() });
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
  if (!user) return res.json(makeStarterDB());
  res.json(user.db || makeStarterDB());
});

app.post('/api/db', (req, res) => {
  const token = req.headers['x-vibe-token'];
  const user = getUser(token);
  if (!user) return res.json({ ok: true });
  const users = load();
  const uname = user.username.toLowerCase();
  if (users[uname]) {
    const incoming = req.body;
    if (incoming.songs) {
      incoming.songs = incoming.songs.map(s => {
        if (s.src && (s.src.startsWith('data:') || s.src.startsWith('blob:'))) {
          return { ...s, src: s._serverUrl || '', _missing: true };
        }
        return s;
      });
    }
    users[uname].db = incoming;
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

const multer = require('multer');
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp3';
    cb(null, Date.now() + '_' + crypto.randomBytes(6).toString('hex') + ext);
  }
});
const upload = multer({ storage: multerStorage, limits: { fileSize: 50 * 1024 * 1024 } });

app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: '/files/' + req.file.filename });
});

app.delete('/api/file/:filename', (req, res) => {
  const fn = path.basename(req.params.filename);
  const fp = path.join(UPLOADS_DIR, fn);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ ok: true });
});

app.get('/api/ping', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log('VIBE server on port', PORT));
