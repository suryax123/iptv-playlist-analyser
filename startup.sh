#!/bin/bash

# Azure App Service startup script for Node.js + Nginx

echo "Starting Azure deployment with Nginx..."

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update
    apt-get install -y nginx
fi

# Copy Nginx configuration
echo "Configuring Nginx..."
cp nginx.conf /etc/nginx/sites-available/default

# Test Nginx configuration
nginx -t

# Start Nginx
echo "Starting Nginx..."
service nginx start

# Start Node.js application
echo "Starting Node.js application..."
exec node server.js