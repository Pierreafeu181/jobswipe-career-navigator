# Exemple d'utilisation de DeleteAccountButton

## Intégration dans ProfilePage

Le composant `DeleteAccountButton` est déjà intégré dans `src/pages/ProfilePage.tsx` dans une section "Paramètres du compte" avec une zone de danger.

## Utilisation dans d'autres pages

### Exemple 1 : Dans une page Settings dédiée

```tsx
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { CollapsibleSection } from "@/components/profile/CollapsibleSection";

const SettingsPage = () => {
  return (
    <div className="min-h-screen bg-ultra-light">
      <LogoHeader />
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-graphite mb-6">
          Paramètres
        </h1>
        
        <CollapsibleSection title="Zone de danger" defaultOpen={false}>
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">
              Supprimer mon compte
            </h3>
            <p className="text-sm text-red-700 mb-4">
              La suppression de votre compte est définitive.
            </p>
            <DeleteAccountButton />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};
```

### Exemple 2 : Utilisation simple

```tsx
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

const MyComponent = () => {
  return (
    <div>
      <h2>Paramètres du compte</h2>
      <DeleteAccountButton className="mt-4" />
    </div>
  );
};
```

### Exemple 3 : Avec style personnalisé

```tsx
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

const MyComponent = () => {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-light">
        <h2 className="text-xl font-semibold mb-4">Supprimer mon compte</h2>
        <DeleteAccountButton />
      </div>
    </div>
  );
};
```

## Comportement

1. **Confirmation** : Affiche `window.confirm()` avec un message détaillé
2. **Récupération de session** : Utilise `supabase.auth.getSession()`
3. **Appel Edge Function** : Appelle `supabase.functions.invoke("delete-account")`
4. **Succès** : Déconnecte l'utilisateur et redirige vers `/`
5. **Erreur** : Affiche un message d'erreur sous le bouton

## Props

- `className?: string` - Classes CSS supplémentaires pour le conteneur

## États

- `isDeleting` : Indique si la suppression est en cours
- `error` : Message d'erreur à afficher (si présent)

