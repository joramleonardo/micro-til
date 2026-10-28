# Deploying Micro-TIL to Hostinger

This guide explains how to deploy **Micro-TIL** to your Hostinger account (e.g. as a subdomain like `https://til.jkleonardo.tech` or a subfolder like `https://jkleonardo.tech/til`).

---

## 📦 What to Upload
Everything in this project is pre-configured and ready to run on Hostinger Apache servers:
- `index.html` (Mobile UI)
- `style.css` (GitHub dark/light theme)
- `app.js` (Frontend logic + API bridge)
- `manifest.json`, `sw.js`, `icon.svg` (PWA mobile install support)
- `.htaccess` (HTTPS enforcement, correct MIME types, caching rules)
- `api/commit.php` (Optional PHP backend endpoint)
- `.env.example` (Optional server credentials template)

---

## 🚀 Option A: Host as a Subdomain (Recommended)
Example: `https://til.jkleonardo.tech`

### 1. Create the Subdomain in Hostinger
1. In Hostinger **hPanel**, go to **Websites** → select your domain (`jkleonardo.tech`).
2. Go to **Domains → Subdomains**.
3. Create a new subdomain: `til` (Document root: `public_html/til`).
4. Click **Create**.

### 2. Upload the Files
1. Open **Files → File Manager** in hPanel.
2. Navigate to:
   ```text
   /domains/jkleonardo.tech/public_html/til
   ```
   *(If there is a default file like `default.php`, delete it).*
3. Upload `micro-til-hostinger-deploy.zip` into `/public_html/til`.
4. Right-click `micro-til-hostinger-deploy.zip` → **Extract** → enter `.` (current folder).
5. Delete the `.zip` file after extracting.

### 3. (Optional but Recommended) Setup Server Mode & PIN
If you don't want to type your GitHub Personal Access Token on your phone keyboard:
1. In the file manager inside `/public_html/til`, make a copy of `.env.example` and name it `.env`.
2. Edit `.env` with your details:
   ```ini
   GITHUB_TOKEN=github_pat_your_token_here
   GITHUB_USERNAME=your-github-username
   GITHUB_REPO=til
   GITHUB_BRANCH=main
   COMMIT_STRATEGY=single
   GITHUB_FILE_PATH=TIL.md
   APP_PIN=1234
   ```
3. Save the file.
4. Now, when you open `https://til.jkleonardo.tech` on your phone, you simply enter your `1234` PIN to commit directly from your mobile device!

---

## 📱 Option B: Install on Your Phone's Home Screen
Once your Hostinger URL is live:
1. Open `https://til.jkleonardo.tech` on your phone's browser (Safari on iOS, Chrome on Android).
2. **iOS**: Tap the **Share** button → choose **"Add to Home Screen"**.
3. **Android**: Tap the **Three-dot menu** → choose **"Add to Home screen"** or **"Install app"**.
4. You now have a native-feeling app icon right on your phone!

---

## 🐙 Push to GitHub Repository
To create a backup repository for this app on GitHub:
```bash
git remote add origin https://github.com/<your-username>/micro-til.git
git branch -M main
git push -u origin main
```
