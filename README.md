# Saguaro CRM — Web Version

## Install & Run (Windows / Mac / Linux)

```
npm install
npm run dev
```

Open browser: **http://localhost:3000**
Login: **admin / saguaro2025**

## No build tools required
Uses Node.js 22+ built-in SQLite automatically.
Falls back to sql.js (pure JavaScript) on older Node versions.
No C++ compiler. No Visual Studio. No node-gyp.

## Production
```
npm run build
npm start
```

## Data
Database file: `server/saguaro.db` — back this up regularly.
