# BIA Loyalty Engine - Deployment Guide

## For Your Company's Local Server

This guide covers how to deploy the BIA Loyalty Engine backend on your company's local server with zero hassle.

---

## Option 1: Direct Node.js Installation (Easiest)

### Prerequisites
- Node.js 18+ installed on the server
- Windows, Linux, or macOS

### Steps

1. **Copy Backend Folder**
   ```
   Copy the entire `backend/` folder to your server
   ```

2. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment**
   ```bash
   # Edit .env file
   nano .env
   ```
   Update:
   - `JWT_SECRET` - Generate a strong random key (min 32 chars)
   - `NODE_ENV` - Set to `production`
   - `CORS_ORIGIN` - Set to your frontend URL
   - `DB_PATH` - Set to persistent location (e.g., `/var/lib/bia/loyalty.db`)

4. **Start Server**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:5000`

5. **Keep Running (Using PM2)**
   ```bash
   # Install PM2 globally
   npm install -g pm2
   
   # Start with PM2
   pm2 start server.js --name "bia-loyalty"
   
   # Auto-restart on system reboot
   pm2 startup
   pm2 save
   
   # View logs
   pm2 logs bia-loyalty
   
   # Stop/Restart
   pm2 stop bia-loyalty
   pm2 restart bia-loyalty
   ```

---

## Option 2: Docker Deployment (Recommended for Companies)

Easiest for isolation and consistency.

### Prerequisites
- Docker installed on the server
- (Optional) Docker Compose

### Steps

1. **Copy Backend Folder**
   ```
   Copy the entire `backend/` folder to your server
   ```

2. **Configure Environment**
   ```bash
   # Edit .env in the backend folder
   nano .env
   ```
   Update as needed (Docker uses these values)

3. **Build Docker Image**
   ```bash
   cd backend
   docker build -t bia-loyalty-backend:latest .
   ```

4. **Run Docker Container**
   ```bash
   docker run -d \
     --name bia-loyalty \
     -p 5000:5000 \
     --env-file .env \
     -v $(pwd)/data:/app/data \
     bia-loyalty-backend:latest
   ```

   Or with Docker Compose:
   ```bash
   docker-compose up -d
   ```

5. **Verify Running**
   ```bash
   docker ps
   docker logs bia-loyalty
   ```

6. **Access Health Check**
   ```
   http://localhost:5000/health
   ```

---

## Option 3: Systemd Service (Linux)

For automated startup and monitoring on Linux servers.

### Steps

1. **Create Service File**
   ```bash
   sudo nano /etc/systemd/system/bia-loyalty.service
   ```

2. **Add Configuration**
   ```ini
   [Unit]
   Description=BIA Loyalty Engine Backend
   After=network.target

   [Service]
   Type=simple
   User=nodeuser
   WorkingDirectory=/home/nodeuser/bia-loyalty-simulator/backend
   ExecStart=/usr/bin/node server.js
   Restart=on-failure
   RestartSec=10
   Environment="NODE_ENV=production"
   Environment="PORT=5000"

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and Start**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable bia-loyalty
   sudo systemctl start bia-loyalty
   
   # Check status
   sudo systemctl status bia-loyalty
   
   # View logs
   sudo journalctl -u bia-loyalty -f
   ```

---

## Database Persistence

### Local Development
- Default: `./data/loyalty.db` (auto-created)
- Located in the `backend/data/` folder

### Production Setup
- Update `DB_PATH` in `.env` to a persistent location:
  - Linux: `/var/lib/bia/loyalty.db`
  - Windows: `C:\ProgramData\BIA\loyalty.db`

### Backup
```bash
# Backup database
cp data/loyalty.db data/loyalty.db.backup.$(date +%Y%m%d)

# Or with Docker
docker cp bia-loyalty:/app/data/loyalty.db ./loyalty.db.backup
```

---

## Reverse Proxy Setup (Nginx)

For accessing backend through your company's domain.

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then restart Nginx:
```bash
sudo nginx -s reload
```

---

## Security Checklist

Before going live on your company server:

- [ ] Change `JWT_SECRET` to a strong random key
- [ ] Set `NODE_ENV=production`
- [ ] Update `CORS_ORIGIN` to your actual frontend URL
- [ ] Enable HTTPS/SSL (use Let's Encrypt for free certificates)
- [ ] Set up database backups
- [ ] Configure firewall to only allow necessary ports
- [ ] Use strong authentication for server access
- [ ] Monitor server resources and logs
- [ ] Keep Node.js and dependencies updated

---

## Troubleshooting

### Port 5000 Already in Use
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=5001
```

### Database Lock Error
```
Database is locked
```
Solution:
- Restart the application
- Check if another process is using the database
- Ensure only one instance is running

### CORS Errors in Frontend
- Update `CORS_ORIGIN` in `.env`
- Must match your frontend's URL exactly
- Restart backend after changing

### Memory Issues
- Monitor with: `top` or `htop`
- For Node.js: `pm2 monit`
- SQLite is very memory-efficient; issues usually elsewhere

---

## Monitoring

### Using PM2 Plus (Paid)
```bash
pm2 plus
```

### Using Docker Stats
```bash
docker stats bia-loyalty
```

### Manual Monitoring Script
```bash
# Create monitor.sh
watch -n 5 'echo "=== CPU/Memory ===" && top -bn1 | grep node && echo "=== Database Size ===" && ls -lh data/loyalty.db'
```

---

## Scaling Tips

- **Current Setup**: Handles ~100 concurrent users easily
- **For Larger Load**: 
  - Use PostgreSQL instead of SQLite
  - Set up load balancing with Nginx
  - Use Redis for caching
  - Contact your development team for enterprise setup

---

## Support & Maintenance

- **Logs Location**: 
  - PM2: `pm2 logs bia-loyalty`
  - Docker: `docker logs bia-loyalty`
  - Systemd: `journalctl -u bia-loyalty`

- **Updates**:
  ```bash
  cd backend
  git pull
  npm install
  npm run build (if applicable)
  # Restart service
  ```

---

## Quick Reference Commands

```bash
# Development
npm install
npm run dev

# Production
NODE_ENV=production npm start

# Docker
docker-compose up -d
docker-compose logs -f
docker-compose down

# PM2
pm2 start server.js --name "bia-loyalty"
pm2 restart bia-loyalty
pm2 stop bia-loyalty
pm2 delete bia-loyalty
pm2 status

# Database
sqlite3 data/loyalty.db
.tables
SELECT COUNT(*) FROM users;
```

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Ready for Deployment ✅
