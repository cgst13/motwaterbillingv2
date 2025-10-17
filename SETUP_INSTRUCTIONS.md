# 🎯 Initial Setup & Deployment Instructions

## Step 1: Prepare Your Project

### 1.1 Install Dependencies
Open terminal in project directory and run:
```bash
npm install
```

This will install all required packages including `gh-pages` for deployment.

### 1.2 Test Locally
```bash
npm start
```
Verify the app works at `http://localhost:3000`

---

## Step 2: Push to GitHub

### 2.1 Initialize Git (if not already done)
```bash
git init
git add .
git commit -m "Initial commit - Water Billing System"
```

### 2.2 Connect to GitHub Repository
```bash
git remote add origin https://github.com/cgst13/motwaterbillingv2.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to GitHub Pages

### 3.1 Run Deployment Command
```bash
npm run deploy
```

This will:
1. Build your production app
2. Create/update `gh-pages` branch
3. Deploy to GitHub Pages

### 3.2 Enable GitHub Pages
1. Go to: `https://github.com/cgst13/motwaterbillingv2/settings/pages`
2. Under "Source", select branch: `gh-pages`
3. Click "Save"
4. Wait 2-3 minutes for deployment

### 3.3 Access Your App
Your app will be live at:
```
https://cgst13.github.io/motwaterbillingv2
```

---

## Step 4: Custom Domain (Optional)

### If you want to use your own domain:

1. **Edit CNAME File**
   - Open `public/CNAME`
   - Replace `yourdomain.com` with your actual domain

2. **Configure DNS at Your Domain Registrar**
   
   For root domain (example.com):
   ```
   Type: A
   Name: @
   Value: 185.199.108.153
   ```
   ```
   Type: A
   Name: @
   Value: 185.199.109.153
   ```
   ```
   Type: A
   Name: @
   Value: 185.199.110.153
   ```
   ```
   Type: A
   Name: @
   Value: 185.199.111.153
   ```

   For subdomain (water.example.com):
   ```
   Type: CNAME
   Name: water
   Value: cgst13.github.io
   ```

3. **Set Custom Domain in GitHub**
   - Go to: `https://github.com/cgst13/motwaterbillingv2/settings/pages`
   - Enter your domain in "Custom domain"
   - Click "Save"
   - Enable "Enforce HTTPS"

4. **Wait for DNS Propagation** (can take up to 48 hours)

---

## Step 5: Update Configuration

### 5.1 Environment Variables (Recommended for Production)

Create `.env` file in project root:
```env
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Update `src/supabaseClient.js`:
```javascript
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
```

⚠️ **Important:** Never commit `.env` file to GitHub (already in .gitignore)

---

## Step 6: Future Updates

Whenever you make changes:

```bash
# 1. Commit changes
git add .
git commit -m "Your update message"
git push origin main

# 2. Deploy to GitHub Pages
npm run deploy
```

Changes will be live in 2-3 minutes!

---

## 🔧 Troubleshooting

### App shows blank page
- Check browser console for errors
- Verify `homepage` in `package.json` matches your repo
- Clear browser cache and try again

### Routes not working
- Already configured with `basename={process.env.PUBLIC_URL}`
- Refresh the page should work (handled by 404.html redirect)

### Custom domain not working
- Verify DNS records
- Check CNAME file in `public/` folder
- Wait 24-48 hours for DNS propagation
- Check GitHub Pages settings

### Build errors
```bash
# Clear node modules and reinstall
rm -rf node_modules
npm install

# Try building again
npm run build
```

---

## 📋 Quick Command Reference

```bash
# Development
npm start              # Run locally
npm run build         # Build for production
npm test              # Run tests

# Deployment
npm run deploy        # Deploy to GitHub Pages

# Git
git add .
git commit -m "message"
git push origin main
```

---

## ✅ Post-Deployment Checklist

- [ ] App accessible at GitHub Pages URL
- [ ] All routes work correctly
- [ ] Login/logout functionality works
- [ ] Supabase connection is working
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enabled
- [ ] Tested on mobile devices

---

## 🎉 Success!

Your Water Billing System is now deployed and accessible online!

**Live URL:** https://cgst13.github.io/motwaterbillingv2

For detailed information, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
