# Paramedic Care 018 - Hetzner Deployment Guide

## 1. Server Specifications (Recommended)

| Setting | Value |
|---------|-------|
| **Type** | CX21 (€4.50/mo) or CX31 (€8.50/mo) |
| **Location** | Nuremberg (nbg1) - closest to Serbia |
| **Image** | Ubuntu 24.04 |
| **SSH Key** | Add the public key below |

## 2. SSH Keys

### Public Key (paste into Hetzner)
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA3PIXO9m9ASYN2BntXV+V5SvwvpbuhgYxhf+I85ciCp paramedic-care018-hetzner
```

### Private Key (save as `hetzner_key` on your local machine)
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACANzyFzvZvQEmDdgZ7V1fleUr8L6W7oYGMYX/iPOXIgqQAAAKAcVizEHFYs
xAAAAAtzc2gtZWQyNTUxOQAAACANzyFzvZvQEmDdgZ7V1fleUr8L6W7oYGMYX/iPOXIgqQ
AAAECn5NW8NK0/JiEEDCym3MEox9ENfv4asb+rWq+/2TgQJA3PIXO9m9ASYN2BntXV+V5S
vwvpbuhgYxhf+I85ciCpAAAAGXBhcmFtZWRpYy1jYXJlMDE4LWhldHpuZXIBAgME
-----END OPENSSH PRIVATE KEY-----
```

## 3. Hetzner Setup Steps

### Step 1: Create Server
1. Go to https://console.hetzner.cloud
2. Click "Add Server"
3. Select:
   - Location: **Nuremberg (nbg1)**
   - Image: **Ubuntu 24.04**
   - Type: **CX21** or **CX31**
   - SSH Key: Paste the public key above
   - Cloud config: Paste contents of `cloud-init.yaml`
4. Click "Create & Buy Now"

### Step 2: Configure DNS at Loopia
Add these DNS records for `paramedic-care018.rs`:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 300 |
| A | www | YOUR_SERVER_IP | 300 |

## 4. After Server is Created

### Connect to server
```bash
# Save private key locally
chmod 600 hetzner_key
ssh -i hetzner_key deploy@YOUR_SERVER_IP
```

### Deploy application
```bash
# Clone your GitHub repo
cd /opt/paramedic-care
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Create environment file
cat > .env << 'EOF'
JWT_SECRET=your-secure-random-string-here-min-32-chars
MONGO_URL=mongodb://mongodb:27017
DB_NAME=paramedic_care_018
EOF

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### Setup SSL Certificate
```bash
sudo certbot --nginx -d paramedic-care018.rs -d www.paramedic-care018.rs
```

## 5. Maintenance Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Update deployment
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Backup MongoDB
docker-compose exec mongodb mongodump --out /data/backup
```

## 6. Security Notes

✅ UFW firewall enabled (SSH, HTTP, HTTPS only)
✅ Fail2ban installed for brute-force protection
✅ Non-root user 'deploy' created
✅ SSH key authentication only

## 7. Estimated Monthly Costs

| Service | Cost |
|---------|------|
| Hetzner CX21 | €4.50 |
| Domain (.rs) | ~€15/year |
| **Total** | ~€6/month |
