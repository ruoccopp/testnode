#!/bin/bash
export DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/imposte_forfettari"
export JWT_SECRET="my-development-secret-key-change-in-production-2024"
export GMAIL_USER=""
export GMAIL_APP_PASSWORD=""

echo "🚀 Starting with local environment..."
npm run db:push && npm run dev
