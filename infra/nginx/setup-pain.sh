#!/usr/bin/env bash
set -euo pipefail

CONF_NAME="pain.divine-haven.com"
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# Step 1: HTTP-only bootstrap for certbot (cert paths don't exist yet)
sudo tee "/etc/nginx/sites-available/${CONF_NAME}" > /dev/null <<'EOF'
server {
    listen 80;
    server_name pain.divine-haven.com;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf "/etc/nginx/sites-available/${CONF_NAME}" "/etc/nginx/sites-enabled/${CONF_NAME}"
sudo nginx -t
sudo systemctl reload nginx

# Step 2: Issue TLS cert
sudo certbot certonly --nginx -d pain.divine-haven.com --non-interactive --agree-tos -m admin@divine-haven.com || \
  sudo certbot certonly --nginx -d pain.divine-haven.com

# Step 3: Install full HTTPS vhost
sudo cp "${REPO_DIR}/infra/nginx/pain.divine-haven.com.conf" "/etc/nginx/sites-available/${CONF_NAME}"
sudo nginx -t
sudo systemctl reload nginx

echo "Done. Open https://pain.divine-haven.com and create your accounts."
