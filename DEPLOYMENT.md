# Sense360 Flash - GitHub Pages Deployment Guide

## Prerequisites

1. Create a new repository on GitHub named `sense360-flash`
2. Set the repository to public (required for GitHub Pages on free accounts)

## Manual Upload Steps

### 1. Prepare the Repository

```bash
# Initialize git repository locally
git init
git add .
git commit -m "Initial commit: Sense360 Flash ESP32 Tool"
git branch -M main
git remote add origin https://github.com/sense360store/sense360-flash.git
git push -u origin main
```

### 2. Configure GitHub Pages

1. Go to your repository settings: `https://github.com/sense360store/sense360-flash/settings`
2. Scroll down to "Pages" in the left sidebar
3. Under "Source", select "GitHub Actions"
4. The deployment workflow will run automatically on every push to main

### 3. Environment Variables (Optional)

For better GitHub API rate limits, you can set a GitHub token:

1. Go to Repository Settings → Secrets and Variables → Actions
2. Add a new repository secret named `GITHUB_TOKEN` (this is automatically provided)
3. For private repositories or higher rate limits, create a Personal Access Token:
   - Go to GitHub Settings → Developer settings → Personal Access Tokens
   - Create a token with `public_repo` scope
   - Add it as a secret named `VITE_GITHUB_TOKEN`

### 4. Custom Domain (Optional)

If you want to use a custom domain:

1. Add a `CNAME` file to the repository root with your domain
2. Configure DNS settings to point to `sense360store.github.io`

## Build Configuration

The project is configured to:
- Build the static site to `dist/public`
- Use `/sense360-flash/` as base URL for GitHub Pages
- Include all necessary assets and dependencies

## Repository Structure for GitHub

```
sense360-flash/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated deployment
├── client/                     # React frontend source
├── server/                     # Development server (not deployed)
├── shared/                     # Shared TypeScript types
├── dist/                       # Build output (auto-generated)
├── package.json
├── vite.config.ts
├── README.md
└── DEPLOYMENT.md
```

## Firmware Management

Once deployed, to add new firmware:

1. Create a new release in the GitHub repository
2. Upload `.bin` files following the naming convention:
   - `{family}.{version}.{type}.bin`
   - Example: `air_quality_monitor.v1.0.0.factory.bin`
3. The web tool will automatically discover new firmware

## Deployment URLs

- **Development**: `https://replit.com/@yourusername/sense360-flash`
- **Production**: `https://sense360store.github.io/sense360-flash/`

## Troubleshooting

### Build Fails
- Check Node.js version (requires 20+)
- Verify all dependencies are correctly listed
- Check for TypeScript errors

### GitHub Pages Not Working
- Ensure repository is public
- Check GitHub Actions tab for build logs
- Verify Pages source is set to "GitHub Actions"

### Firmware Not Loading
- Check repository exists and is public
- Verify release assets are properly named
- Check browser console for API errors

## Manual Build Process (Alternative)

If you prefer manual deployment:

```bash
# Build the project locally
npm run build

# The output will be in dist/public/
# Upload this folder to any static hosting service
```

The built files in `dist/public/` can be uploaded to:
- GitHub Pages (recommended)
- Netlify
- Vercel
- Any static hosting service