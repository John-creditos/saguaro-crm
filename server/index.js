```javascript
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../dist')))

const DB_PATH = path.join(__dirname, 'saguaro.db')

let db = null

// ─────────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────────
function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)
}

function seedData() {
  try {
    const admin = db.prepare(
      "SELECT * FROM users WHERE username=?"
    ).get("admin")

    if (!admin) {
      db.prepare(`
        INSERT INTO users (username, password, role, name)
        VALUES (?, ?, ?, ?)
      `).run(
        "admin",
        "saguaro2025",
        "admin",
        "System Administrator"
      )

      console.log("✅ Admin created")
    }

  } catch (err) {
    console.error("Seed error:", err)
  }
}

// ─────────────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────────────
const sessions = new Map()

function genToken() {
  return (
    Math.random().toString(36).substring(2) +
    Date.now().toString(36)
  )
}

function auth(req, res, next) {
  const token = req.headers['x-auth-token']

  if (!token || !sessions.has(token)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    })
  }

  req.user = sessions.get(token)
  next()
}

// ─────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body

    const user = db.prepare(
      'SELECT * FROM users WHERE username=? AND password=?'
    ).get(username, password)

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    const token = genToken()

    sessions.set(token, {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    })

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    })

  } catch (err) {
    console.error(err)

    res.status(500).json({
      success: false,
      error: 'Server error'
    })
  }
})

app.post('/api/auth/logout', auth, (req, res) => {
  const token = req.headers['x-auth-token']

  sessions.delete(token)

  res.json({
    success: true
  })
})

// ─────────────────────────────────────────────────────
// TEST ROUTE
// ─────────────────────────────────────────────────────
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API working'
  })
})

// ─────────────────────────────────────────────────────
// FRONTEND
// ─────────────────────────────────────────────────────
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html')

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.send('Saguaro CRM Backend Running')
  }
})

// ─────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────
async function start() {

  try {

    const { DatabaseSync } = require('node:sqlite')

    db = new DatabaseSync(DB_PATH)

    db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;
    `)

    createTables()
    seedData()

    console.log('✅ SQLite connected')

  } catch (err) {

    console.error('Database error:', err)

    process.exit(1)
  }

  app.listen(PORT, '0.0.0.0', () => {

    console.log('')
    console.log('✅ Saguaro CRM running')
    console.log(`✅ Port: ${PORT}`)
    console.log(`✅ DB: ${DB_PATH}`)
    console.log('')
  })
}

start()