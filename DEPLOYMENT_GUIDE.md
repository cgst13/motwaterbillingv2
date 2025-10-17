# 🚀 GitHub Pages Deployment Guide

## Quick Deployment Steps

### 1. Install Dependencies
```bash
npm install
```

This will install `gh-pages` package needed for deployment.

### 2. Deploy to GitHub Pages
```bash
npm run deploy
```

This command will:
- Build the production version of your app
- Deploy it to the `gh-pages` branch
- Make it available at: `https://cgst13.github.io/motwaterbillingv2`

---

## 🌐 Custom Domain Setup

### Option 1: Using GitHub Pages Default Domain
Your app will be available at:
```
https://cgst13.github.io/motwaterbillingv2
```

No additional setup needed!

### Option 2: Using Custom Domain

#### Step 1: Update CNAME File
Edit `public/CNAME` and replace with your domain:
```
yourdomain.com
```
or
```
subdomain.yourdomain.com
```

#### Step 2: Configure DNS Records
Go to your domain registrar and add DNS records:

**For Root Domain (yourdomain.com):**
Add these A records:
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

**For Subdomain (www.yourdomain.com or subdomain.yourdomain.com):**
Add CNAME record:
```
Type: CNAME
Name: www (or your subdomain)
Value: cgst13.github.io
```

#### Step 3: Enable Custom Domain in GitHub
1. Go to your repository: `https://github.com/cgst13/motwaterbillingv2`
2. Click **Settings** → **Pages**
3. Under "Custom domain", enter your domain
4. Click **Save**
5. Wait for DNS check (may take up to 48 hours)
6. Enable **Enforce HTTPS** (recommended)

---

## 📋 Environment Variables

### Important: Supabase Configuration
Make sure your Supabase credentials in `src/supabaseClient.js` are correctly set:

```javascript
const supabaseUrl = 'your-supabase-url'
const supabaseAnonKey = 'your-supabase-anon-key'
```

⚠️ **Security Note:** For production, consider using environment variables:

1. Create `.env` file (already in .gitignore):
```env
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

2. Update `src/supabaseClient.js`:
```javascript
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
```

---

## 🔄 Update Deployment

Every time you make changes:

```bash
# 1. Commit your changes
git add .
git commit -m "Your commit message"
git push origin main

# 2. Deploy to GitHub Pages
npm run deploy
```

---

## 🛠️ Troubleshooting

### Issue: Blank page after deployment
**Solution:** 
- Ensure `homepage` in `package.json` matches your repo name
- Current setting: `"homepage": "https://cgst13.github.io/motwaterbillingv2"`

### Issue: 404 on page refresh
**Solution:** 
- Already handled by `404.html` redirect script
- SPA routing is configured in `public/index.html` and `public/404.html`

### Issue: Custom domain not working
**Solutions:**
1. Verify DNS records are correct
2. Wait 24-48 hours for DNS propagation
3. Check GitHub Pages settings
4. Ensure CNAME file exists in `public/` folder

### Issue: Routes not working
**Solution:**
- `basename={process.env.PUBLIC_URL}` is already configured in `App.js`
- This handles both GitHub Pages subdirectory and custom domain

---

## 📦 Build for Other Hosting

If you want to deploy elsewhere (Netlify, Vercel, etc.):

```bash
npm run build
```

The optimized build will be in the `build/` folder.

---

## ✅ Checklist Before First Deployment

- [ ] `npm install` completed successfully
- [ ] Supabase credentials are correct
- [ ] `.gitignore` includes sensitive files
- [ ] Repository name matches homepage in `package.json`
- [ ] All code committed to main branch
- [ ] Run `npm run deploy`

---

## 🔒 Security Best Practices

1. **Never commit** `.env` files
2. **Use environment variables** for sensitive data
3. **Enable HTTPS** on custom domain
4. **Keep dependencies updated**: `npm audit fix`
5. **Supabase RLS policies** should be properly configured

---

## 📞 Support

Repository: https://github.com/cgst13/motwaterbillingv2

For GitHub Pages documentation: https://docs.github.com/en/pages
