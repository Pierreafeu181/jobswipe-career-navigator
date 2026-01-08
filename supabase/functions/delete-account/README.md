# Edge Function: delete-account

Cette fonction Supabase Edge Function permet de supprimer un compte utilisateur de manière sécurisée.

## Fonctionnalités

- ✅ Authentification via token Bearer
- ✅ Vérification de l'identité de l'utilisateur
- ✅ Suppression sécurisée via l'API admin
- ✅ Gestion automatique des données associées (ON DELETE CASCADE)

## Commandes CLI

### 1. Créer la fonction (si elle n'existe pas déjà)

```bash
supabase functions new delete-account
```

### 2. Déployer la fonction

```bash
supabase functions deploy delete-account
```

### 3. Déployer avec des secrets (recommandé)

```bash
supabase secrets set SUPABASE_URL=<votre-url>
supabase secrets set SUPABASE_ANON_KEY=<votre-anon-key>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<votre-service-role-key>

supabase functions deploy delete-account
```

## Secrets à configurer

Les secrets suivants doivent être configurés dans Supabase :

| Secret | Description | Où le trouver |
|--------|-------------|---------------|
| `SUPABASE_URL` | URL de votre projet Supabase | Dashboard Supabase > Settings > API > Project URL |
| `SUPABASE_ANON_KEY` | Clé publique anonyme | Dashboard Supabase > Settings > API > anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé de service role (admin) | Dashboard Supabase > Settings > API > service_role key |

⚠️ **IMPORTANT** : La `SUPABASE_SERVICE_ROLE_KEY` est très sensible. Ne l'exposez jamais côté client !

## Configuration des secrets

### Via CLI Supabase

```bash
# Définir les secrets un par un
supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
supabase secrets set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Vérifier les secrets configurés
supabase secrets list
```

### Via Dashboard Supabase

1. Allez dans votre projet Supabase
2. Naviguez vers **Edge Functions** > **Settings**
3. Ajoutez les secrets dans la section **Secrets**

## Utilisation

### Depuis le frontend (TypeScript/JavaScript)

```typescript
import { supabase } from '@/lib/supabaseClient';

async function deleteAccount() {
  try {
    // Récupérer le token de session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    // Appeler la fonction Edge
    const { data, error } = await supabase.functions.invoke('delete-account', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      throw error;
    }

    console.log('Account deleted successfully:', data);
    // Rediriger vers la page de connexion ou déconnexion
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error deleting account:', error);
  }
}
```

### Exemple avec fetch

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/delete-account`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }
);

const result = await response.json();
```

## Réponses

### Succès (200)

```json
{
  "ok": true
}
```

### Erreurs possibles

- **401 Unauthorized** : Token manquant ou invalide
  ```json
  {
    "error": "Invalid or expired token"
  }
  ```

- **500 Internal Server Error** : Erreur lors de la suppression
  ```json
  {
    "error": "Failed to delete user",
    "details": "..."
  }
  ```

## Notes importantes

1. **ON DELETE CASCADE** : Les tables `profiles` et `swipes` ont déjà `ON DELETE CASCADE` configuré, donc les données associées seront automatiquement supprimées.

2. **Sécurité** : Cette fonction nécessite une authentification valide. Seul l'utilisateur authentifié peut supprimer son propre compte.

3. **Service Role Key** : La clé service role est utilisée uniquement côté serveur pour effectuer la suppression. Elle ne doit jamais être exposée au client.

4. **CORS** : La fonction gère automatiquement les requêtes CORS pour permettre les appels depuis le frontend.

