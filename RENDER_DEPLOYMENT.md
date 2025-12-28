# Render Deployment Guide

This guide will walk you through deploying the Spur Agent application to Render.

## Prerequisites

- GitHub account with your code pushed to a repository
- Render account (sign up at https://render.com)
- Google Gemini API key
- PostgreSQL database (we'll create one on Render)

## Step 1: Create PostgreSQL Database on Render

1. Log in to Render dashboard: https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `spur-agent-db` (or any name you prefer)
   - **Database**: `spur_agent`
   - **User**: Auto-generated (or choose your own)
   - **Region**: Choose closest to you
   - **PostgreSQL Version**: Latest (14+)
   - **Plan**: Free tier is fine for testing
4. Click **"Create Database"**
5. Wait for database to be created (takes 1-2 minutes)
6. Once ready, click on your database
7. Go to **"Connections"** tab
8. Copy the **"External Connection String"** - you'll need this for your backend

**Important**: Use the **External Connection String** (not Internal) for your backend service.

## Step 2: Deploy Backend to Render

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure the service:

   **Basic Settings:**
   - **Name**: `spur-agent-backend`
   - **Region**: Same as your database
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend` (important!)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

   **Environment Variables:**
   Click **"Add Environment Variable"** and add:
   - `GEMINI_API_KEY` = `your_gemini_api_key_here`
   - `DATABASE_URL` = `your_external_postgresql_connection_string`
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render sets this automatically, but good to have)
   - `FRONTEND_URL` = `https://your-frontend-url.onrender.com` (we'll update this after deploying frontend)

4. Click **"Create Web Service"**
5. Render will start building and deploying your backend
6. Wait for deployment to complete (5-10 minutes)
7. Once deployed, copy your backend URL (e.g., `https://spur-agent-backend.onrender.com`)

## Step 3: Run Database Migration

After backend is deployed, we need to run the migration:

1. Go to your backend service in Render
2. Click on **"Shell"** tab
3. Run:
   ```bash
   npm run migrate
   ```
4. Wait for migration to complete
5. You should see: "✓ Migration completed successfully!"

## Step 4: Deploy Frontend to Render

1. In Render dashboard, click **"New +"** → **"Static Site"**
2. Connect your GitHub repository
3. Configure:

   **Basic Settings:**
   - **Name**: `spur-agent-frontend`
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build` (SvelteKit outputs to `build` directory)

   **Environment Variables:**
   - `VITE_API_URL` = `https://your-backend-url.onrender.com/api`

4. Click **"Create Static Site"**
5. Render will build and deploy your frontend
6. Wait for deployment to complete (3-5 minutes)
7. Copy your frontend URL (e.g., `https://spur-agent-frontend.onrender.com`)

## Step 5: Update Environment Variables

1. Go back to your **backend service**
2. Go to **"Environment"** tab
3. Update `FRONTEND_URL` to your actual frontend URL
4. Click **"Save Changes"**
5. Render will automatically redeploy

## Step 6: Test Your Deployment

1. Open your frontend URL in a browser
2. Try sending a message
3. Check backend logs in Render dashboard if there are any issues

## Troubleshooting

### Backend Issues

- **Database connection errors**: Make sure you're using the **External Connection String** (not Internal)
- **Migration errors**: Run migration via Shell tab in Render
- **Build errors**: Check build logs in Render dashboard
- **CORS errors**: Make sure `FRONTEND_URL` is set correctly in backend env vars

### Frontend Issues

- **API connection errors**: Verify `VITE_API_URL` is set correctly
- **Build errors**: Check build logs, ensure all dependencies are in `package.json`

### Common Commands

**View backend logs:**
- Go to backend service → "Logs" tab

**Run migration manually:**
- Go to backend service → "Shell" tab → `npm run migrate`

**Restart service:**
- Go to service → "Manual Deploy" → "Clear build cache & deploy"

## Notes

- Free tier services on Render spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds (cold start)
- For production, consider upgrading to paid plans for always-on services
- Database backups are recommended for production use

## Your URLs

After deployment, you'll have:
- **Backend**: `https://spur-agent-backend.onrender.com`
- **Frontend**: `https://spur-agent-frontend.onrender.com`
- **Database**: Managed by Render (connection string in env vars)

