#!/bin/bash
# ==============================================================================
# hSECURITIES HQ — 1-Click Ubuntu / Linux Server Deployer
# Domain: office.hsecurities.in
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}================================================================${NC}"
echo -e "${CYAN}   🛡️  hSECURITIES HQ — Self-Hosted Linux Server Installer       ${NC}"
echo -e "${CYAN}   Domain Target: office.hsecurities.in                         ${NC}"
echo -e "${BLUE}================================================================${NC}"

# 1. Root Check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script as root (use: sudo bash install-linux.sh)${NC}"
  exit 1
fi

# 2. Update System & Install Base Tools
echo -e "\n${YELLOW}[1/6] Updating packages & installing prerequisites...${NC}"
apt-get update -y
apt-get install -y curl wget git ufw certbot openssl unzip

# 3. Install Docker & Docker Compose if missing
echo -e "\n${YELLOW}[2/6] Checking Docker & Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${CYAN}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo -e "${GREEN}✓ Docker already installed.${NC}"
fi

# 4. Open Required Firewall Ports
echo -e "\n${YELLOW}[3/6] Configuring Firewall (UFW)...${NC}"
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
echo "y" | ufw enable || true

# 5. Setup Environment File
echo -e "\n${YELLOW}[4/6] Initializing Environment Variables (.env)...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    # Generate random secure secrets
    RANDOM_JWT=$(openssl rand -hex 32)
    RANDOM_DB_PASS=$(openssl rand -hex 16)
    
    sed -i "s/hSecCyberSchoolSuperSecretKey2026!/$RANDOM_JWT/g" .env
    sed -i "s/CyberCampus2026!/$RANDOM_DB_PASS/g" .env
    echo -e "${GREEN}✓ Generated secure credentials in .env${NC}"
else
    echo -e "${GREEN}✓ Existing .env preserved.${NC}"
fi

# 6. SSL Certificate Setup
echo -e "\n${YELLOW}[5/6] Checking SSL Certificate for office.hsecurities.in...${NC}"
mkdir -p /etc/letsencrypt/live/office.hsecurities.in
if [ ! -f /etc/letsencrypt/live/office.hsecurities.in/fullchain.pem ]; then
    echo -e "${CYAN}Attempting to obtain Let's Encrypt certificate...${NC}"
    # Stop temporary web servers if running
    systemctl stop nginx 2>/dev/null || true
    
    certbot certonly --standalone -d office.hsecurities.in \
        --non-interactive --agree-tos -m admin@hsecurities.in || {
        echo -e "${YELLOW}[WARNING] Certbot standalone failed (DNS might not point to this IP yet).${NC}"
        echo -e "${YELLOW}Generating self-signed SSL fallback so Nginx starts immediately...${NC}"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/letsencrypt/live/office.hsecurities.in/privkey.pem \
            -out /etc/letsencrypt/live/office.hsecurities.in/fullchain.pem \
            -subj "/C=IN/ST=Delhi/L=Delhi/O=hSECURITIES/CN=office.hsecurities.in"
    }
else
    echo -e "${GREEN}✓ SSL certificate already exists.${NC}"
fi

# 7. Build and Run Docker Containers
echo -e "\n${YELLOW}[6/6] Building and Launching Virtual Campus Platform...${NC}"
cd docker
docker compose down || true
docker compose up -d --build

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}   🎉 hSECURITIES HQ IS NOW LIVE ON YOUR LINUX SERVER!          ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "${CYAN}🌐 Virtual Campus URL:  https://office.hsecurities.in${NC}"
echo -e "${CYAN}🗺️  Self-Hosted Map URL: https://office.hsecurities.in/map/hq.tmj${NC}"
echo -e "${CYAN}🔑 Admin Login:         admin@hsecurities.in / Admin@hSec2026!${NC}"
echo -e "${YELLOW}----------------------------------------------------------------${NC}"
echo -e "Monitor live logs using: ${BLUE}cd docker && docker compose logs -f${NC}"
