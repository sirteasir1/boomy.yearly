# Boomly — Deploy Checklist

## 1. Firebase Setup
```bash
# Install CLI
npm install -g firebase-tools
firebase login
firebase init  # select Firestore, Hosting (optional)

# Deploy rules + indexes
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## 2. Environment Variables
Create `.env.local` (never commit this):
```
GEMINI_API_KEY=AIzaSy...            # aistudio.google.com
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## 3. Firebase Console
- Auth → Sign-in method → **Email/Password: Enable**
- Auth → Sign-in method → **Google: Enable**
- Auth → Settings → Authorized domains → add `localhost` + your Vercel domain
- Firestore → Create database → **production mode** → europe-west1

## 4. Vercel Deploy
```bash
npm install -g vercel
vercel --prod
# Add all env vars in Vercel dashboard → Settings → Environment Variables
```

## 5. Vercel Domain → Firebase Auth
After deploy, add your Vercel domain to Firebase Authorized Domains:
Firebase Console → Authentication → Settings → Authorized domains → Add domain

## 6. Test Gemini
Visit `/api/ai/debug` to see which Gemini model is active.

## Troubleshooting
| Error | Fix |
|---|---|
| `auth/invalid-credential` | Enable Email/Password in Firebase Auth |
| `accounts:lookup 400` | Add localhost to Authorized Domains |
| `Gemini 429 quota` | Check aistudio.google.com rate limits |
| `Gemini 404 model not found` | Visit /api/ai/debug — fallback will pick working model |
| Calendar events disappear | Deploy firestore:rules |
| BIS patterns not showing | Deploy firestore:indexes, then complete 3+ tasks |
