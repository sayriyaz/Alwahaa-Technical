#!/bin/bash

# Setup script for Alwahaa Technical Services
# Run this after creating your Supabase project

echo "=== Alwahaa Technical Services - Environment Setup ==="
echo ""
echo "Visit https://supabase.com/dashboard and get your credentials from Project Settings > API"
echo ""

# Check if .env.local already exists
if [ -f .env.local ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env.local"
        exit 0
    fi
fi

# Get credentials from user
echo ""
read -p "Enter your Supabase Project URL (https://xxxxxx.supabase.co): " supabase_url
read -p "Enter your Supabase Anon Key: " supabase_key

# Create .env.local
cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabase_key
EOF

echo ""
echo "✅ .env.local created successfully!"
echo ""
echo "Next steps:"
echo "1. Run the SQL schema in your Supabase SQL Editor (supabase/schema.sql)"
echo "2. Run: npm run dev"
echo "3. Open http://localhost:3000"
echo ""
echo "To create your first admin user:"
echo "1. Go to Authentication > Users in Supabase Dashboard"
echo "2. Click 'Add User' and enter email/password"
echo "3. Run this SQL to make them admin:"
echo "   INSERT INTO app_users (id, email, full_name, role) SELECT id, email, 'Admin', 'admin' FROM auth.users WHERE email='your-email@example.com';"
