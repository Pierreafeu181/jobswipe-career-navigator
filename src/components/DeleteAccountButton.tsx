import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Trash2, Loader2, AlertCircle } from "lucide-react";

interface DeleteAccountButtonProps {
  className?: string;
}

/**
 * Composant bouton pour supprimer le compte utilisateur
 * 
 * Comportement :
 * - Affiche une confirmation avant suppression
 * - Appelle la fonction Edge delete-account
 * - Déconnecte l'utilisateur et redirige en cas de succès
 * - Affiche les erreurs en cas d'échec
 */
export const DeleteAccountButton = ({ className }: DeleteAccountButtonProps) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    // Réinitialiser l'erreur
    setError(null);

    // Confirmation utilisateur
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir supprimer votre compte ?\n\n" +
      "Cette action est irréversible et supprimera définitivement :\n" +
      "• Votre profil\n" +
      "• Toutes vos offres likées\n" +
      "• Toutes vos données personnelles\n\n" +
      "Cette action ne peut pas être annulée."
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);

      // Récupérer la session actuelle
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`Erreur lors de la récupération de la session : ${sessionError.message}`);
      }

      if (!session) {
        throw new Error("Aucune session active. Veuillez vous reconnecter.");
      }

      if (!session.access_token) {
        throw new Error("Token d'accès manquant dans la session.");
      }

      console.log("[DeleteAccount] Appel de la fonction Edge delete-account...");

      // Appeler la fonction Edge delete-account
      const { data, error: deleteError } = await supabase.functions.invoke("delete-account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (deleteError) {
        console.error("[DeleteAccount] Erreur lors de l'appel de la fonction:", deleteError);
        throw new Error(
          deleteError.message || "Erreur lors de la suppression du compte. Veuillez réessayer."
        );
      }

      // Vérifier la réponse
      if (data && data.error) {
        console.error("[DeleteAccount] Erreur retournée par la fonction:", data.error);
        throw new Error(data.error || "Erreur lors de la suppression du compte.");
      }

      console.log("[DeleteAccount] Compte supprimé avec succès:", data);

      // Déconnecter l'utilisateur
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.warn("[DeleteAccount] Erreur lors de la déconnexion:", signOutError);
        // Même si la déconnexion échoue, on redirige quand même
      }

      // Rediriger vers la page d'accueil
      navigate("/", { replace: true });
    } catch (err) {
      console.error("[DeleteAccount] Erreur lors de la suppression du compte:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur inattendue s'est produite lors de la suppression du compte."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={className}>
      {/* Message d'erreur */}
      {error && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Erreur lors de la suppression</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Bouton de suppression */}
      <button
        onClick={handleDeleteAccount}
        disabled={isDeleting}
        className="w-full px-6 py-3 rounded-2xl bg-red-500 text-white font-medium shadow-sm hover:bg-red-600 active:scale-95 transition-all duration-200 ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500 disabled:active:scale-100"
        title="Supprimer définitivement mon compte"
      >
        {isDeleting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Suppression en cours...
          </>
        ) : (
          <>
            <Trash2 className="w-5 h-5" />
            Supprimer mon compte
          </>
        )}
      </button>

      {/* Avertissement */}
      <p className="mt-2 text-xs text-gray-500 text-center">
        ⚠️ Cette action est irréversible
      </p>
    </div>
  );
};

