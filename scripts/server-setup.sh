#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  MyKiranam.in — One-Time EC2 Server Setup (Amazon Linux 2023)
#  Run this ONCE on your EC2 instance:
#    chmod +x server-setup.sh && ./server-setup.sh
# ═══════════════════════════════════════════════════════════════════

set -e

echo "╔════════════════════════════════════════════╗"
echo "║   MyKiranam.in — Server Setup Script       ║"
echo "╚════════════════════════════════════════════╝"

# ── 1. System Update ────────────────────────────────────────────
echo ""
echo "📦 Updating system packages..."
sudo yum update -y

# ── 2. Install Node.js 20 (via NodeSource) ──────────────────────
echo ""
echo "📦 Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

echo "   Node version: $(node -v)"
echo "   NPM version:  $(npm -v)"

# ── 3. Install PM2 (Process Manager) ───────────────────────────
echo ""
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Configure PM2 to start on boot
pm2 startup systemd -u ec2-user --hp /home/ec2-user
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

# ── 4. Install Nginx ───────────────────────────────────────────
echo ""
echo "📦 Installing Nginx..."
sudo yum install -y nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
sudo systemctl start nginx

# ── 5. Install rsync (needed for GitHub Actions deployment) ────
echo ""
echo "📦 Installing rsync..."
sudo yum install -y rsync

# ── 6. Create Application Directory ───────────────────────────
echo ""
echo "📁 Creating application directories..."
mkdir -p /home/ec2-user/mykiranam/backend
mkdir -p /home/ec2-user/mykiranam/frontend/dist
mkdir -p /home/ec2-user/mykiranam/backend/uploads

# ── 7. Setup Nginx Configuration ──────────────────────────────
echo ""
echo "🌐 Configuring Nginx..."

# Backup default config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Copy the project nginx config
# NOTE: Copy scripts/nginx.conf to server first, then run:
sudo cp /home/ec2-user/mykiranam/scripts/nginx.conf /etc/nginx/conf.d/mykiranam.conf

# Remove default server block if it conflicts
sudo sed -i '/server {/,/}/d' /etc/nginx/nginx.conf 2>/dev/null || true

# Test and reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# ── 8. Setup Firewall (if applicable) ─────────────────────────
echo ""
echo "🔒 Note: Make sure your EC2 Security Group allows:"
echo "   - Port 22  (SSH)"
echo "   - Port 80  (HTTP)"
echo "   - Port 443 (HTTPS — if using SSL)"
echo ""

# ── 9. Install Git ────────────────────────────────────────────
echo ""
echo "📦 Installing Git..."
sudo yum install -y git

# ── Done! ──────────────────────────────────────────────────────
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   ✅ Server setup complete!                ║"
echo "║                                            ║"
echo "║   Node.js : $(node -v)                     "
echo "║   NPM     : $(npm -v)                      "
echo "║   PM2     : $(pm2 -v)                       "
echo "║   Nginx   : $(nginx -v 2>&1)               "
echo "║                                            ║"
echo "║   App Dir : /home/ec2-user/mykiranam       ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Add your GitHub repo secrets (see walkthrough)"
echo "  2. Push to 'main' branch to trigger deployment"
echo "  3. Visit http://<your-ec2-ip> to see the app"
