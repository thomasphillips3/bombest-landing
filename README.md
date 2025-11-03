# Bombest Audio Landing Page

A minimalist, professional landing page for Bombest Audio at www.bom.best.

## Deployment Instructions

### Step 1: Push to GitHub

1. Navigate to the website folder and initialize git repository (if not already done):
```bash
cd website
git init
git add index.html bombest-logo.png CNAME .nojekyll README.md
git commit -m "Initial commit: Bombest Audio landing page"
```

2. Create a new repository on GitHub (e.g., `bombest-landing`)

3. Push to GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/bombest-landing.git
git branch -M main
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select **main** branch and **/ (root)** folder
4. Click **Save**
5. GitHub will build and deploy your site (takes 1-2 minutes)

### Step 3: Configure DNS for bom.best Domain

You need to configure your DNS settings with your domain registrar. Add the following DNS records:

#### For Apex Domain (bom.best):
Add these **A records** pointing to GitHub's servers:
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

#### For www Subdomain (www.bom.best):
Add a **CNAME record**:
```
www.bom.best → YOUR_USERNAME.github.io
```

#### Example DNS Configuration:
| Type  | Name | Value                    | TTL  |
|-------|------|--------------------------|------|
| A     | @    | 185.199.108.153          | 3600 |
| A     | @    | 185.199.109.153          | 3600 |
| A     | @    | 185.199.110.153          | 3600 |
| A     | @    | 185.199.111.153          | 3600 |
| CNAME | www  | YOUR_USERNAME.github.io  | 3600 |

### Step 4: Verify Custom Domain in GitHub

1. Go back to **Settings** → **Pages** in your GitHub repository
2. Under **Custom domain**, enter: `www.bom.best`
3. Click **Save**
4. Wait for DNS check to complete (may take a few minutes to 48 hours)
5. Once verified, check **Enforce HTTPS** for secure connections

### Step 5: Test Your Site

Once DNS propagates (usually 5-30 minutes, can take up to 48 hours):
- Visit https://www.bom.best
- Verify the logo, text, and contact button work correctly
- Test on mobile devices for responsiveness

## Files

- `index.html` - Main landing page
- `bombest-logo.png` - Bombest Audio logo
- `CNAME` - Custom domain configuration for GitHub Pages
- `.nojekyll` - Tells GitHub Pages to serve files as-is (no Jekyll processing)
- `README.md` - This file

## Contact

Email: thomas@bom.best

## License

© 2025 Bombest LLC

