# 🚀 hSECURITIES HQ — Production Ubuntu Server Deployment Guide

This guide walks you through deploying the complete self-hosted virtual campus platform on an **Ubuntu 22.04 / 24.04 LTS** server under the domain **`office.hsecurities.in`**.

---

## 📋 System Prerequisites

| Component | Minimum Specification | Recommended |
|---|---|---|
| **OS** | Ubuntu 22.04 / 24.04 LTS | Ubuntu 24.04 LTS |
| **CPU** | 2 vCPUs | 4 vCPUs |
| **RAM** | 2 GB | 4 GB+ |
| **Storage** | 25 GB SSD | 50 GB NVMe |
| **Ports** | `80` (HTTP), `443` (HTTPS) | `80`, `443` |

---

## Step 1: DNS Configuration

In your DNS management console (e.g. Cloudflare, GoDaddy, Route53), add an **A Record**:

```text
Type: A
Name: office
Value: <YOUR_UBUNTU_SERVER_PUBLIC_IP>
TTL: Automatic (or 300)
```

Verify DNS propagation on your local machine:
```bash
ping office.hsecurities.in
```

---

## Step 2: Server Preparation & Docker Installation

SSH into your Ubuntu server:
```bash
ssh root@<YOUR_UBUNTU_SERVER_PUBLIC_IP>
```

Update system packages and install Docker:
```bash
# Update repositories
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y curl git ufw certbot

# Install Docker & Docker Compose plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify installations
docker --version
docker compose version
```

Configure Firewall (UFW):
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Step 3: Obtain SSL Certificate (Let's Encrypt)

Before starting Nginx in Docker, generate the SSL certificate using Certbot:

```bash
# Stop any webserver temporarily if running
sudo systemctl stop nginx 2>/dev/null || true

# Obtain SSL Certificate
sudo certbot certonly --standalone -d office.hsecurities.in --non-interactive --agree-tos -m admin@hsecurities.in
```

Your certificates will be stored at:
- `/etc/letsencrypt/live/office.hsecurities.in/fullchain.pem`
- `/etc/letsencrypt/live/office.hsecurities.in/privkey.pem`

---

## Step 4: Clone the Repository & Configure Environment

```bash
# Clone the repository
git clone https://github.com/hsecurities/hsecurities-hq.git /opt/hsecurities-hq
cd /opt/hsecurities-hq

# Copy environment template
cp .env.example .env

# Generate secure JWT secret and set database credentials
nano .env
```

Ensure `.env` contains:
```env
NODE_ENV=production
POSTGRES_USER=hsec_admin
POSTGRES_PASSWORD=YourStrongPasswordHere!
POSTGRES_DB=hsecurities_hq
JWT_SECRET=YourGenerated64CharSecretHere!
CLIENT_URL=https://office.hsecurities.in
NEXT_PUBLIC_API_URL=https://office.hsecurities.in/api
NEXT_PUBLIC_SOCKET_URL=https://office.hsecurities.in
```

---

## Step 5: Launch with Docker Compose

Run the entire platform (PostgreSQL, Backend API, Socket.IO, Next.js, and Nginx):

```bash
cd /opt/hsecurities-hq/docker
docker compose up -d --build
```

Monitor container initialization:
```bash
docker compose ps
docker compose logs -f
```

---

## Step 6: Verify Database & Default Credentials

The database initializes automatically with `database/schema.sql` and `database/seeds.sql`.

Default Root Administrator account:
- **Email**: `admin@hsecurities.in`
- **Password**: `Admin@hSec2026!`
- **Clearance Level**: `Super Admin (Priority 7)`

> ⚠️ **Important**: Log into the admin dashboard at `https://office.hsecurities.in/login` immediately after launch and update the root administrator password.

---

## Step 7: Automated SSL Renewal Setup

Create a systemd timer or cron job for automatic certificate renewal:

```bash
# Add renewal script
sudo crontab -e
```
Add the following line to renew twice daily and reload Nginx:
```text
0 3,15 * * * certbot renew --quiet && docker exec hsec_nginx nginx -s reload
```

---

## 🛠️ Management & Maintenance Commands

```bash
# View live application logs
cd /opt/hsecurities-hq/docker
docker compose logs -f server
docker compose logs -f client

# Restart services
docker compose restart

# Pull updates and rebuild
git pull origin main
docker compose up -d --build

# Backup database
docker exec -t hsec_postgres pg_dump -U hsec_admin hsecurities_hq > backup_$(date +%Y%m%d).sql
```
