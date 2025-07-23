#!/bin/bash
echo "🔄 Adding all files..."
git add .

echo "📝 Committing changes..."
git commit -m "Deploying changes"
echo "📦 Packaging the deployment..."

# check if the script is being run from the correct branch
branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "❌ You must be on the 'main' branch to deploy."
  exit 1
fi
# Push to GitHub
echo "🔄 Pushing to GitHub..."
git push github main

# Push to your server via SSH
# echo "🚀 Deploying to profgriffin.com..."

# echo "🔄 Adding all files..."
# git add .

# echo "📝 Committing changes..."
# git commit -m "Deploying changes"


# echo "📡 Pulling from Server and rebasing ..."
# git pull --rebase server main

# echo "🔄 Pushing to server..."
# git push server main

echo "✅ Deployment complete!"