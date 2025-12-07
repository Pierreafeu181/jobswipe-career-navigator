# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/cc6fb0a3-f007-45ed-90a9-8fcacbbbedb6

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/cc6fb0a3-f007-45ed-90a9-8fcacbbbedb6) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

### Déploiement sur Vercel

Ce projet est prêt pour un déploiement sur Vercel. Suivez ces étapes :

#### 1. Prérequis

- Un compte Vercel (gratuit) : https://vercel.com
- Un compte Supabase avec un projet configuré
- Votre code versionné sur GitHub/GitLab/Bitbucket

#### 2. Configuration des variables d'environnement

Dans le dashboard Vercel, allez dans **Settings > Environment Variables** et ajoutez :

- `VITE_SUPABASE_URL` : L'URL de votre projet Supabase (ex: `https://xxxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` : La clé anonyme publique de Supabase (trouvable dans Supabase > Settings > API)

**⚠️ IMPORTANT** : Utilisez uniquement la clé **anon public**, jamais la `service_role_key` côté frontend.

#### 3. Déploiement

**Option A : Via l'interface Vercel**
1. Connectez votre repository GitHub/GitLab/Bitbucket à Vercel
2. Vercel détectera automatiquement que c'est un projet Vite
3. La commande de build est déjà configurée : `npm run build`
4. Cliquez sur "Deploy"

**Option B : Via la CLI Vercel**
```bash
npm i -g vercel
vercel
```

#### 4. PWA et Service Worker

Une fois déployé sur Vercel :
- ✅ L'application sera automatiquement servie en HTTPS (requis pour les PWA)
- ✅ Le manifest (`/manifest.webmanifest`) sera accessible
- ✅ Le service worker (`/service-worker.js`) sera enregistré automatiquement
- ✅ Les utilisateurs pourront installer l'application ("Ajouter à l'écran d'accueil" / "Installer l'application")

#### 5. Configuration Google OAuth (si utilisé)

Si vous utilisez l'authentification Google, n'oubliez pas de :
1. Mettre à jour l'URL de redirection dans Google Cloud Console avec votre URL Vercel
2. Format : `https://votre-projet.vercel.app/auth/callback`

### Déploiement via Lovable

Vous pouvez aussi déployer via [Lovable](https://lovable.dev/projects/cc6fb0a3-f007-45ed-90a9-8fcacbbbedb6) en cliquant sur Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
