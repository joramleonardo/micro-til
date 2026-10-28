# Micro-TIL 📱✨
A mobile-first web app designed to let you quickly record "Today I Learned" (TIL) notes and commit them directly to your GitHub repository from your phone or any browser—keeping your learning habit and GitHub streak alive even when you're away from your laptop.

---

## 🌟 Why Micro-TIL?
When you're commuting, traveling, or don't have your laptop around, you still read articles, discover tools, or learn concepts. Instead of faking commits with an automated bot, **Micro-TIL** lets you write a quick 1–2 sentence insight and push a genuine, meaningful commit to GitHub in under 15 seconds.

## ✨ Features
- **Mobile-First & PWA Ready:** Installable to your phone's home screen (iOS & Android) like a native app.
- **Direct GitHub API Integration:** Communicates directly with GitHub's REST API using your personal access token. No middleman backend required.
- **Zero Server Setup:** Can be hosted completely free on **GitHub Pages**, **Vercel**, or **Netlify**.
- **Privacy First:** Your GitHub token is stored solely in your device's browser (`localStorage`), never sent to any third-party server.
- **Smart Append or Daily Files:** Choose whether each note appends to a master `TIL.md` / `README.md` or creates organized daily notes (`til/YYYY-MM-DD.md`).
- **Quick Category Tags & Templates:** "💡 Quick Insight", "🐛 Bug Fix", "📖 Read Article", "⚙️ Tech Tip".
- **Local Draft Recovery:** Never lose what you typed if your connection drops.
- **Recent TIL Feed:** View your latest entries directly inside the app.

---

## 🚀 Quick Setup Guide

### Step 1: Create a Fine-Grained GitHub Personal Access Token
1. Go to **GitHub Settings** → **Developer Settings** → **Personal Access Tokens** → [Fine-grained tokens](https://github.com/settings/tokens?type=beta).
2. Click **Generate new token**.
3. Set a name (e.g., `Micro-TIL App`).
4. Under **Repository access**, select **Only select repositories** and pick your target repository (e.g. a `til` or `notes` repo).
5. Under **Permissions** → **Repository permissions**, grant:
   - **Contents**: `Read and write`
6. Click **Generate token** and copy the token (starts with `github_pat_...`).

### Step 2: Open Micro-TIL on Your Phone or Browser
- Open `index.html` locally or deploy it to GitHub Pages / Vercel (see Deployment section below).
- Go to the **Settings** tab (gear icon in the top right).
- Enter:
  - **GitHub Username** (e.g. `your-github-username`)
  - **Repository Name** (e.g. `til` or `my-notes`)
  - **Branch** (usually `main`)
  - **Target File / Path** (default: `TIL.md`)
  - **Personal Access Token** (your token from Step 1)
- Tap **Save & Test Connection**.

### Step 3: Deploy Free to GitHub Pages (Recommended)
1. Create a new repository on your GitHub (e.g., `micro-til-app`).
2. Push the files in this folder to that repository.
3. In the repository settings, go to **Pages** → Source: **Deploy from a branch** (`main` / root).
4. GitHub Pages will give you a live URL (e.g., `https://your-username.github.io/micro-til-app/`).
5. Open that URL on your phone's browser, tap **Share** (iOS Safari) or **Menu** (Android Chrome), and choose **"Add to Home Screen"**.

Now you have an icon on your phone just like an app!
