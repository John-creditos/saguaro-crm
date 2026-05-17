const express  = require('express')
const cors     = require('cors')
const path     = require('path')
const fs       = require('fs')

const app  = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../dist')))

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'saguaro.db')
let db = null

// ── DB wrapper — works with BOTH Node.js 22 built-in SQLite AND sql.js ──
function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT UNIQUE,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT,
      phone TEXT,
      country TEXT DEFAULT 'Zambia',
      industry TEXT,
      status TEXT DEFAULT 'Prospect',
      type TEXT DEFAULT 'Corporate',
      nda_signed INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS engagements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eng_id TEXT UNIQUE,
      client_id INTEGER,
      service_type TEXT,
      description TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'Active',
      stage TEXT DEFAULT 'Lead',
      fee REAL DEFAULT 0,
      fee_type TEXT DEFAULT 'Retainer',
      currency TEXT DEFAULT 'ZMW',
      probability INTEGER DEFAULT 50,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE,
      client_id INTEGER,
      engagement_id INTEGER,
      invoice_date TEXT,
      due_date TEXT,
      currency TEXT DEFAULT 'ZMW',
      subtotal REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      status TEXT DEFAULT 'Unpaid',
      payment_method TEXT,
      date_paid TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      description TEXT,
      qty REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      amount REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      client_id INTEGER,
      engagement_id INTEGER,
      due_date TEXT,
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'Pending',
      assigned_to TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      engagement_id INTEGER,
      date TEXT,
      type TEXT,
      subject TEXT,
      notes TEXT,
      outcome TEXT,
      next_steps TEXT,
      follow_up_date TEXT,
      logged_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)
}

function seedData() {
  try {
    const admin = db.prepare("SELECT * FROM users WHERE username=?").get("admin")

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

      console.log("✅ Admin user created")
    } else {
      console.log("✓ Admin already exists")
    }

    const defaults = [
      ['company_name','Saguaro Private Equity'],
      ['company_address','Lusaka, Zambia'],
      ['company_email','info@saguaroprivateequity.com'],
      ['company_website','www.saguaroprivateequity.com'],
      ['company_phone','+260 XXX XXX XXX'],
      ['invoice_prefix','SPE-INV'],
      ['default_currency','ZMW'],
      ['default_tax_rate','16']
    ]

    defaults.forEach(([k,v]) => {
      const exists = db.prepare('SELECT key FROM settings WHERE key=?').get(k)

      if (!exists) {
        db.prepare('INSERT INTO settings (key,value) VALUES (?,?)').run(k,v)
      }
    })

  } catch (err) {
    console.error("Seed error:", err)
  }
}
// ══ AUTH ═════════════════════════════════════════════════
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body
  const user = db.prepare('SELECT * FROM users WHERE username=? AND password=?').get(username, password)
  if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' })
  const token = genToken()
  sessions.set(token, { id: user.id, name: user.name, role: user.role, username: user.username })
  res.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role, username: user.username } })
})
app.post('/api/auth/logout', auth, (req, res) => {
  sessions.delete(req.headers['x-auth-token'])
  res.json({ success: true })
})

// ══ CLIENTS ══════════════════════════════════════════════
app.get('/api/clients', auth, (req, res) => {
  res.json(db.prepare(`SELECT c.*,(SELECT COUNT(*) FROM engagements WHERE client_id=c.id) as engagement_count,(SELECT COALESCE(SUM(total),0) FROM invoices WHERE client_id=c.id) as total_invoiced FROM clients c ORDER BY c.created_at DESC`).all())
})
app.get('/api/clients/:id', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM clients WHERE id=?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})
app.post('/api/clients', auth, (req, res) => {
  const d = req.body
  const n = db.prepare('SELECT COUNT(*) as n FROM clients').get().n
  const clientId = `SPE-CL-${String(n+1).padStart(3,'0')}`
  const r = db.prepare(`INSERT INTO clients (client_id,name,company,email,phone,country,industry,status,type,nda_signed,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(clientId,d.name,d.company||'',d.email||'',d.phone||'',d.country||'Zambia',d.industry||'',d.status||'Prospect',d.type||'Corporate',d.nda_signed||0,d.notes||'')
  res.json({ id: r.lastInsertRowid, client_id: clientId })
})
app.put('/api/clients/:id', auth, (req, res) => {
  const d = req.body
  db.prepare(`UPDATE clients SET name=?,company=?,email=?,phone=?,country=?,industry=?,status=?,type=?,nda_signed=?,notes=?,updated_at=datetime('now') WHERE id=?`)
    .run(d.name,d.company||'',d.email||'',d.phone||'',d.country||'',d.industry||'',d.status||'',d.type||'',d.nda_signed||0,d.notes||'',req.params.id)
  res.json({ success: true })
})
app.delete('/api/clients/:id', auth, (req, res) => {
  db.prepare('DELETE FROM clients WHERE id=?').run(req.params.id)
  res.json({ success: true })
})

// ══ ENGAGEMENTS ══════════════════════════════════════════
app.get('/api/engagements', auth, (req, res) => {
  res.json(db.prepare(`SELECT e.*,c.name as client_name,c.company as client_company FROM engagements e LEFT JOIN clients c ON e.client_id=c.id ORDER BY e.created_at DESC`).all())
})
app.get('/api/engagements/by-client/:clientId', auth, (req, res) => {
  res.json(db.prepare(`SELECT e.*,c.name as client_name FROM engagements e LEFT JOIN clients c ON e.client_id=c.id WHERE e.client_id=? ORDER BY e.created_at DESC`).all(req.params.clientId))
})
app.post('/api/engagements', auth, (req, res) => {
  const d = req.body
  const n = db.prepare('SELECT COUNT(*) as n FROM engagements').get().n
  const engId = `SPE-ENG-${String(n+1).padStart(3,'0')}`
  const r = db.prepare(`INSERT INTO engagements (eng_id,client_id,service_type,description,start_date,end_date,status,stage,fee,fee_type,currency,probability,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(engId,d.client_id,d.service_type||'',d.description||'',d.start_date||'',d.end_date||'',d.status||'Active',d.stage||'Lead',d.fee||0,d.fee_type||'Retainer',d.currency||'ZMW',d.probability||50,d.notes||'')
  res.json({ id: r.lastInsertRowid, eng_id: engId })
})
app.put('/api/engagements/:id', auth, (req, res) => {
  const d = req.body
  db.prepare(`UPDATE engagements SET client_id=?,service_type=?,description=?,start_date=?,end_date=?,status=?,stage=?,fee=?,fee_type=?,currency=?,probability=?,notes=?,updated_at=datetime('now') WHERE id=?`)
    .run(d.client_id,d.service_type||'',d.description||'',d.start_date||'',d.end_date||'',d.status||'',d.stage||'',d.fee||0,d.fee_type||'',d.currency||'ZMW',d.probability||50,d.notes||'',req.params.id)
  res.json({ success: true })
})
app.delete('/api/engagements/:id', auth, (req, res) => {
  db.prepare('DELETE FROM engagements WHERE id=?').run(req.params.id)
  res.json({ success: true })
})

// ══ INVOICES ═════════════════════════════════════════════
app.get('/api/invoices', auth, (req, res) => {
  res.json(db.prepare(`SELECT i.*,c.name as client_name,e.eng_id,e.service_type FROM invoices i LEFT JOIN clients c ON i.client_id=c.id LEFT JOIN engagements e ON i.engagement_id=e.id ORDER BY i.created_at DESC`).all())
})
app.get('/api/invoices/:id', auth, (req, res) => {
  const inv = db.prepare(`SELECT i.*,c.name as client_name,c.company,c.email as client_email,c.phone as client_phone,c.country,e.eng_id,e.service_type FROM invoices i LEFT JOIN clients c ON i.client_id=c.id LEFT JOIN engagements e ON i.engagement_id=e.id WHERE i.id=?`).get(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  res.json({ ...inv, items: db.prepare('SELECT * FROM invoice_items WHERE invoice_id=?').all(req.params.id) })
})
app.post('/api/invoices', auth, (req, res) => {
  const d = req.body
  const s = {}
  db.prepare('SELECT key,value FROM settings').all().forEach(r => s[r.key]=r.value)
  const year = new Date().getFullYear()
  const n = db.prepare(`SELECT COUNT(*) as n FROM invoices WHERE invoice_date LIKE '${year}%'`).get().n
  const invNo = `${s.invoice_prefix||'SPE-INV'}-${year}-${String(n+1).padStart(4,'0')}`
  const tax = (d.subtotal*(d.tax_rate||0))/100
  const total = d.subtotal+tax-(d.discount||0)
  const r = db.prepare(`INSERT INTO invoices (invoice_no,client_id,engagement_id,invoice_date,due_date,currency,subtotal,tax_rate,tax_amount,discount,total,amount_paid,balance,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?,'Unpaid',?)`)
    .run(invNo,d.client_id,d.engagement_id||null,d.invoice_date,d.due_date,d.currency||'ZMW',d.subtotal,d.tax_rate||0,tax,d.discount||0,total,total,d.notes||'')
  const invId = r.lastInsertRowid
  ;(d.items||[]).filter(i=>i.description).forEach(i =>
    db.prepare('INSERT INTO invoice_items (invoice_id,description,qty,unit_price,amount) VALUES (?,?,?,?,?)').run(invId,i.description,i.qty,i.unit_price,i.qty*i.unit_price)
  )
  res.json({ id: invId, invoice_no: invNo })
})
app.put('/api/invoices/:id', auth, (req, res) => {
  const d = req.body
  const tax = (d.subtotal*(d.tax_rate||0))/100
  const total = d.subtotal+tax-(d.discount||0)
  const balance = total-(d.amount_paid||0)
  let status = 'Unpaid'
  if ((d.amount_paid||0)>=total) status='Paid'
  else if ((d.amount_paid||0)>0) status='Partial'
  else if (d.due_date && new Date(d.due_date)<new Date()) status='Overdue'
  db.prepare(`UPDATE invoices SET client_id=?,engagement_id=?,invoice_date=?,due_date=?,currency=?,subtotal=?,tax_rate=?,tax_amount=?,discount=?,total=?,amount_paid=?,balance=?,status=?,payment_method=?,date_paid=?,notes=? WHERE id=?`)
    .run(d.client_id,d.engagement_id||null,d.invoice_date,d.due_date,d.currency,d.subtotal,d.tax_rate||0,tax,d.discount||0,total,d.amount_paid||0,balance,status,d.payment_method||'',d.date_paid||'',d.notes||'',req.params.id)
  db.prepare('DELETE FROM invoice_items WHERE invoice_id=?').run(req.params.id)
  ;(d.items||[]).filter(i=>i.description).forEach(i =>
    db.prepare('INSERT INTO invoice_items (invoice_id,description,qty,unit_price,amount) VALUES (?,?,?,?,?)').run(req.params.id,i.description,i.qty,i.unit_price,i.qty*i.unit_price)
  )
  res.json({ success: true, status })
})
app.delete('/api/invoices/:id', auth, (req, res) => {
  db.prepare('DELETE FROM invoice_items WHERE invoice_id=?').run(req.params.id)
  db.prepare('DELETE FROM invoices WHERE id=?').run(req.params.id)
  res.json({ success: true })
})

// ══ TASKS ════════════════════════════════════════════════
app.get('/api/tasks', auth, (req, res) => {
  res.json(db.prepare(`SELECT t.*,c.name as client_name FROM tasks t LEFT JOIN clients c ON t.client_id=c.id ORDER BY t.due_date ASC, t.created_at DESC`).all())
})
app.post('/api/tasks', auth, (req, res) => {
  const d = req.body
  const r = db.prepare(`INSERT INTO tasks (title,description,client_id,engagement_id,due_date,priority,status,assigned_to) VALUES (?,?,?,?,?,?,?,?)`)
    .run(d.title,d.description||'',d.client_id||null,d.engagement_id||null,d.due_date||'',d.priority||'Medium',d.status||'Pending',d.assigned_to||'')
  res.json({ id: r.lastInsertRowid })
})
app.put('/api/tasks/:id', auth, (req, res) => {
  const d = req.body
  db.prepare(`UPDATE tasks SET title=?,description=?,client_id=?,due_date=?,priority=?,status=?,assigned_to=? WHERE id=?`)
    .run(d.title,d.description||'',d.client_id||null,d.due_date||'',d.priority||'Medium',d.status||'Pending',d.assigned_to||'',req.params.id)
  res.json({ success: true })
})
app.delete('/api/tasks/:id', auth, (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id)
  res.json({ success: true })
})

// ══ INTERACTIONS ═════════════════════════════════════════
app.get('/api/interactions', auth, (req, res) => {
  const cid = req.query.client_id
  res.json(cid
    ? db.prepare('SELECT i.*,c.name as client_name FROM interactions i LEFT JOIN clients c ON i.client_id=c.id WHERE i.client_id=? ORDER BY i.date DESC').all(cid)
    : db.prepare('SELECT i.*,c.name as client_name FROM interactions i LEFT JOIN clients c ON i.client_id=c.id ORDER BY i.date DESC').all()
  )
})
app.post('/api/interactions', auth, (req, res) => {
  const d = req.body
  const r = db.prepare(`INSERT INTO interactions (client_id,engagement_id,date,type,subject,notes,outcome,next_steps,follow_up_date,logged_by) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(d.client_id,d.engagement_id||null,d.date||'',d.type||'',d.subject||'',d.notes||'',d.outcome||'',d.next_steps||'',d.follow_up_date||'',d.logged_by||'')
  res.json({ id: r.lastInsertRowid })
})

// ══ DASHBOARD ════════════════════════════════════════════
app.get('/api/dashboard', auth, (req, res) => {
  const yr = new Date().getFullYear()
  res.json({
    totalClients:       db.prepare("SELECT COUNT(*) as n FROM clients").get().n,
    activeClients:      db.prepare("SELECT COUNT(*) as n FROM clients WHERE status='Active'").get().n,
    activeEngagements:  db.prepare("SELECT COUNT(*) as n FROM engagements WHERE status='Active'").get().n,
    unpaidInvoices:     db.prepare("SELECT COUNT(*) as n FROM invoices WHERE status IN ('Unpaid','Partial','Overdue')").get().n,
    outstandingBalance: db.prepare("SELECT COALESCE(SUM(balance),0) as n FROM invoices WHERE status IN ('Unpaid','Partial','Overdue')").get().n,
    totalInvoicedYTD:   db.prepare(`SELECT COALESCE(SUM(total),0) as n FROM invoices WHERE invoice_date LIKE '${yr}%'`).get().n,
    overdueInvoices:    db.prepare("SELECT COUNT(*) as n FROM invoices WHERE status='Overdue'").get().n,
    pendingTasks:       db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status='Pending'").get().n,
    recentInvoices:     db.prepare(`SELECT i.*,c.name as client_name FROM invoices i LEFT JOIN clients c ON i.client_id=c.id ORDER BY i.created_at DESC LIMIT 8`).all(),
    recentClients:      db.prepare('SELECT * FROM clients ORDER BY created_at DESC LIMIT 5').all(),
    pipelineByStage:    db.prepare('SELECT stage,COUNT(*) as count,COALESCE(SUM(fee),0) as value FROM engagements GROUP BY stage').all(),
    monthlyRevenue:     db.prepare(`SELECT substr(invoice_date,6,2) as month,COALESCE(SUM(total),0) as invoiced,COALESCE(SUM(amount_paid),0) as collected FROM invoices WHERE invoice_date LIKE '${yr}%' GROUP BY month ORDER BY month`).all(),
    upcomingTasks:      db.prepare(`SELECT t.*,c.name as client_name FROM tasks t LEFT JOIN clients c ON t.client_id=c.id WHERE t.status='Pending' ORDER BY t.due_date ASC LIMIT 5`).all(),
  })
})

// ══ SETTINGS ═════════════════════════════════════════════
app.get('/api/settings', auth, (req, res) => {
  const s = {}; db.prepare('SELECT key,value FROM settings').all().forEach(r => s[r.key]=r.value)
  res.json(s)
})
app.put('/api/settings', auth, (req, res) => {
  Object.entries(req.body).forEach(([k,v]) => {
    const ex = db.prepare('SELECT key FROM settings WHERE key=?').get(k)
    if (ex) db.prepare('UPDATE settings SET value=? WHERE key=?').run(v,k)
    else db.prepare('INSERT INTO settings (key,value) VALUES (?,?)').run(k,v)
  })
  res.json({ success: true })
})


// ══ TEAM / USERS ═════════════════════════════════════════
app.get('/api/team', auth, (req, res) => {
  res.json(db.prepare("SELECT id,username,name,role,created_at FROM users ORDER BY created_at ASC").all())
})

app.post('/api/team', auth, (req, res) => {
  const d = req.body
  if (!d.username || !d.password) return res.status(400).json({ error: 'Username and password required' })
  const exists = db.prepare('SELECT id FROM users WHERE username=?').get(d.username)
  if (exists) return res.status(400).json({ error: 'Username already taken' })
  const r = db.prepare("INSERT INTO users (username,password,role,name) VALUES (?,?,?,?)")
    .run(d.username.trim(), d.password, d.role||'staff', d.name||d.username)
  res.json({ id: r.lastInsertRowid })
})

app.put('/api/team/:id', auth, (req, res) => {
  const d = req.body
  if (d.password) {
    db.prepare("UPDATE users SET name=?,role=?,password=? WHERE id=?").run(d.name, d.role, d.password, req.params.id)
  } else {
    db.prepare("UPDATE users SET name=?,role=? WHERE id=?").run(d.name, d.role, req.params.id)
  }
  res.json({ success: true })
})

app.delete('/api/team/:id', auth, (req, res) => {
  const user = db.prepare('SELECT username FROM users WHERE id=?').get(req.params.id)
  if (user?.username === 'admin') return res.status(400).json({ error: 'Cannot delete admin' })
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id)
  res.json({ success: true })
})

app.put('/api/team/:id/password', auth, (req, res) => {
  const { password } = req.body
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  db.prepare('UPDATE users SET password=? WHERE id=?').run(password, req.params.id)
  res.json({ success: true })
})

app.get('*', (req, res) => {
  const p = path.join(__dirname,'../dist/index.html')
  fs.existsSync(p) ? res.sendFile(p) : res.json({ status:'API running. Open http://localhost:3000 for the frontend.' })
})

// ══ START ════════════════════════════════════════════════
async function start() {
  // Strategy 1: Node.js 22+ built-in SQLite (no npm package needed at all)
  try {
    const { DatabaseSync } = require('node:sqlite')
    db = new DatabaseSync(DB_PATH)
    db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;')
    createTables()
    seedData()
    console.log('✓ Node.js built-in SQLite — no compilation required')
  } catch(e1) {
    // Strategy 2: sql.js (pure JavaScript, pre-compiled WASM)
    try {
      const initSqlJs = require('sql.js')
      const SQL = await initSqlJs()
      let sqlDb
      if (fs.existsSync(DB_PATH)) {
        sqlDb = new SQL.Database(fs.readFileSync(DB_PATH))
      } else {
        sqlDb = new SQL.Database()
      }
      const save = () => fs.writeFileSync(DB_PATH, Buffer.from(sqlDb.export()))
      // Wrap sql.js API to match the built-in SQLite API
      db = {
        exec: sql => { sqlDb.run(sql); save() },
        prepare: sql => ({
          run: (...p) => {
            sqlDb.run(sql, p); save()
            const r = sqlDb.exec('SELECT last_insert_rowid() as id')
            return { lastInsertRowid: r[0]?.values[0]?.[0] || 0 }
          },
          get: (...p) => {
            const r = sqlDb.exec(sql, p)
            if (!r[0]) return undefined
            const obj = {}; r[0].columns.forEach((c,i) => obj[c]=r[0].values[0]?.[i]); return obj.id !== undefined || Object.keys(obj).length ? obj : undefined
          },
          all: (...p) => {
            const r = sqlDb.exec(sql, p)
            if (!r[0]) return []
            return r[0].values.map(row => { const o={}; r[0].columns.forEach((c,i) => o[c]=row[i]); return o })
          }
        }),
        pragma: () => {}
      }
      createTables()
      seedData()
      console.log('✓ sql.js SQLite (pure JavaScript — no compilation required)')
    } catch(e2) {
      console.error('Could not initialise database:', e2.message)
      process.exit(1)
    }
  }

    app.listen(PORT, '0.0.0.0', () => {
    console.log('\n✅ Saguaro CRM is running')
    console.log(`Server listening on port ${PORT}`)
    console.log(`Database: ${DB_PATH}`)
  })
}

start()
