# VPS deployment

Set these GitHub Actions secrets before enabling the workflow:

- VPS_HOST
- VPS_USERNAME
- VPS_SSH_KEY
- VPS_PORT (optional, defaults to 22)
- VPS_DEPLOY_PATH

Example deployment path:

- /var/www/jollyhqserver

The workflow will:

1. Install dependencies and run npm run build
2. Upload the built artifacts to your VPS
3. Extract the archive and restart the app with PM2 if available
