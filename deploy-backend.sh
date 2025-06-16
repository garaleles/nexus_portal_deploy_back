#!/bin/bash

echo "🚀 Backend Deployment Script - Railway"
echo "=====================================\n"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Login check
echo "🔐 Railway Authentication..."
railway whoami > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Please login to Railway first:"
    echo "railway login"
    exit 1
fi

echo "✅ Railway CLI authenticated\n"

# Link to project if needed
echo "🔗 Linking to Railway project..."
railway link nexus-business-portal --service business-portal-backend

echo "\n📝 Setting Environment Variables..."

# Core Application Settings
railway variables --set NODE_ENV=production
railway variables --set PORT=3000

# Database Configuration (will be set automatically by Railway PostgreSQL plugin)
echo "✅ Database variables will be set automatically by PostgreSQL plugin"

# JWT Secret (generate a secure one)
railway variables --set JWT_SECRET="your-super-secure-jwt-secret-min-32-chars-here-change-this!"

# Keycloak Configuration
railway variables --set KEYCLOAK_URL="https://business-portal-keycloak-production.up.railway.app"
railway variables --set KEYCLOAK_REALM="nexus-portal"
railway variables --set KEYCLOAK_CLIENT_ID="business-portal"
railway variables --set KEYCLOAK_ADMIN_USERNAME="admin"
railway variables --set KEYCLOAK_ADMIN_PASSWORD="SuperSecure123!"

# Super Admin Configuration
railway variables --set SUPER_ADMIN_EMAIL="admin@nexus-portal.com"
railway variables --set SUPER_ADMIN_PASSWORD="SuperAdmin123!"
railway variables --set SUPER_ADMIN_FIRST_NAME="Super"
railway variables --set SUPER_ADMIN_LAST_NAME="Admin"

# Encryption Settings
railway variables --set ENCRYPTION_KEY="32-character-encryption-key-here!!"
railway variables --set ENCRYPTION_IV="16-char-iv-here"

# Frontend URL (will be updated after frontend deployment)
railway variables --set FRONTEND_URL="https://your-frontend-service.up.railway.app"

echo "\n🚀 Starting deployment..."

# Deploy the service
railway up --detach

echo "\n✅ Backend deployment initiated!"
echo "📊 Check deployment status: railway status"
echo "📋 View logs: railway logs"
echo "🌐 Your backend will be available at: https://your-backend-service.up.railway.app"

echo "\n⚠️  Don't forget to:"
echo "1. Add PostgreSQL plugin to your service"
echo "2. Update frontend URL after frontend deployment"
echo "3. Update Keycloak redirect URIs with actual URLs"
echo "4. Generate secure JWT_SECRET and ENCRYPTION keys for production" 