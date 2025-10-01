# Development Setup Guide

## Critical Configuration Information

### Environment Files

This project uses environment-specific configuration:

```
server/
  ├── .env                # Production settings (tracked by Git)
  └── .env.development    # Development overrides (NOT tracked by Git)
```

### Production vs Development Differences

| Setting | Production (.env) | Development (.env.development) | Reason |
|---------|-------------------|-------------------------------|---------|
| `ENABLE_HTTPS` | `true` | `false` | No SSL certificate in dev |
| `NODE_ENV` | `production` | `development` | Environment detection |

### Initial Setup (For New Developers)

1. **Create `.env.development` file in server folder:**
   ```bash
   cd server
   echo "ENABLE_HTTPS=false" > .env.development
   ```

2. **Install dependencies:**
   ```bash
   # In root directory
   npm install

   # For client
   cd client2
   npm install

   # For server
   cd ../server
   npm install
   ```

3. **Build the client:**
   ```bash
   cd client2
   npm run build
   ```

4. **Start the application:**
   ```bash
   # In root directory
   npm start
   ```

### Why This Architecture?

1. **Security**: HTTPS is mandatory in production
2. **Development Ease**: No need for SSL certificate setup in dev
3. **Deployment Safety**: `.env.development` is not tracked by Git, preventing accidental deployment of dev settings

### Important Notes

⚠️ **NEVER commit `.env.development` to Git!**
- This file is listed in `.gitignore`
- Each developer must create it locally

⚠️ **For Production Build:**
- Settings from `.env` file are used
- `ENABLE_HTTPS=true` must be set
- `NODE_ENV=production` must be set

### Troubleshooting

**Problem: "SSL handshake failed" errors**
- **Solution**: Ensure `ENABLE_HTTPS=false` in `.env.development`

**Problem: API connection error in development**
- **Solution**: Verify server is running in HTTP mode (port 3001)

**Problem: Security warning in production**
- **Solution**: Ensure `ENABLE_HTTPS=true` in `.env`

### Terminal Encoding Issue (Windows)

If German characters don't display correctly:
```powershell
chcp 65001
```

### Development Workflow

1. **Start backend** (optional - Electron starts it automatically):
   ```bash
   cd server
   npm start
   ```

2. **Start Electron application**:
   ```bash
   npm start
   ```

3. **DevTools**: Press F12 to open

### Git Workflow

When committing changes:
- `.env` file: Production settings, can be committed
- `.env.development`: Development settings, NEVER commit
- `.gitignore`: Lists both environment files

### Build & Deploy

For production build:
```bash
npm run build-win
```

Build output will be in `dist/` folder.