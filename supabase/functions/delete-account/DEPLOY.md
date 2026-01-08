# Guide de déploiement - delete-account

## Commandes rapides

### 1. Créer la fonction (première fois uniquement)
```bash
supabase functions new delete-account
```

### 2. Configurer les secrets
```bash
supabase secrets set SUPABASE_URL=<votre-url>
supabase secrets set SUPABASE_ANON_KEY=<votre-anon-key>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<votre-service-role-key>
```

### 3. Déployer la fonction
```bash
supabase functions deploy delete-account
```

## Liste complète des secrets requis

| Variable | Description | Exemple |
|----------|-------------|---------|
| `SUPABASE_URL` | URL de votre projet Supabase | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Clé publique anonyme | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (admin) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## Où trouver ces valeurs ?

1. Connectez-vous à [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **API**
4. Copiez :
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **SECRET**

## Vérification

Pour vérifier que les secrets sont bien configurés :
```bash
supabase secrets list
```

## Test local (optionnel)

Pour tester la fonction localement avant de déployer :
```bash
supabase functions serve delete-account
```

Puis testez avec :
```bash
curl -X POST http://localhost:54321/functions/v1/delete-account \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

