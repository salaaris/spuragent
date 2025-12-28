# GitHub Setup Commands

Follow these commands to push your project to GitHub.

## Step 1: Initialize Git Repository

```bash
cd "X:\projects\spur agent"
git init
```

## Step 2: Add All Files

```bash
git add .
```

## Step 3: Create Initial Commit

```bash
git commit -m "Initial commit: Spur Agent AI Live Chat Support"
```

## Step 4: Create Repository on GitHub

1. Go to https://github.com
2. Click the **"+"** icon in top-right → **"New repository"**
3. Repository name: `spur-agent` (or your preferred name)
4. Description: `AI-powered live chat support agent for Spur take-home assignment`
5. Choose **Public** or **Private**
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click **"Create repository"**

## Step 5: Add Remote and Push

After creating the repository on GitHub, you'll see a URL like:
`https://github.com/your-username/spur-agent.git`

Run these commands (replace with your actual GitHub username and repo name):

```bash
git remote add origin https://github.com/your-username/spur-agent.git
git branch -M main
git push -u origin main
```

## Alternative: If You Already Have a Repository

If you already created the repository and want to push to it:

```bash
git remote add origin https://github.com/your-username/spur-agent.git
git branch -M main
git push -u origin main
```

## If You Get Authentication Errors

If GitHub asks for authentication:

1. **Use Personal Access Token** (recommended):
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` scope
   - Use token as password when pushing

2. **Or use GitHub CLI**:
   ```bash
   gh auth login
   ```

## Verify Push

After pushing, refresh your GitHub repository page. You should see all your files.

## Next Steps

After pushing to GitHub, you can:
1. Follow `RENDER_DEPLOYMENT.md` to deploy to Render
2. Connect your GitHub repo to Render for automatic deployments

