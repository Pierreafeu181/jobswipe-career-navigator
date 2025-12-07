import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

/**
 * Page de callback pour gérer le retour OAuth (Google, etc.)
 * 
 * Cette page :
 * 1. Récupère la session depuis l'URL après la redirection OAuth
 * 2. Crée automatiquement un profil pour les nouveaux utilisateurs OAuth
 * 3. Redirige vers la page d'accueil
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Attendre un peu pour que Supabase traite les fragments d'URL (#access_token)
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Récupérer la session depuis l'URL (Supabase gère automatiquement les fragments #access_token)
        // On utilise getSession() qui lit depuis localStorage et les fragments d'URL
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // Si pas de session, attendre un peu plus et réessayer (parfois Supabase a besoin de plus de temps)
        if (!session?.user && !sessionError) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const retryResult = await supabase.auth.getSession();
          session = retryResult.data.session;
          sessionError = retryResult.error;
        }

        if (sessionError) {
          console.error("Erreur lors de la récupération de la session:", sessionError);
          setError("Erreur lors de la connexion. Veuillez réessayer.");
          setTimeout(() => navigate("/"), 3000);
          return;
        }

        if (!session?.user) {
          setError("Aucune session trouvée. Redirection vers la page de connexion...");
          setTimeout(() => navigate("/"), 3000);
          return;
        }

        // Vérifier si un profil existe déjà pour cet utilisateur
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileCheckError) {
          console.error("Erreur lors de la vérification du profil:", profileCheckError);
        }

        // Si aucun profil n'existe, créer un profil par défaut avec les données Google
        if (!existingProfile) {
          const userMetadata = session.user.user_metadata;
          const fullName = userMetadata?.full_name || userMetadata?.name || "";
          const nameParts = fullName.split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";

          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: session.user.id,
              first_name: firstName || userMetadata?.given_name || "",
              last_name: lastName || userMetadata?.family_name || "",
              city: userMetadata?.city || "",
              target_role: userMetadata?.target_role || "",
              experience_level: userMetadata?.experience_level || "",
            });

          if (profileError) {
            console.error("Erreur lors de la création du profil:", profileError);
            // On continue quand même, l'utilisateur pourra compléter son profil plus tard
          }
        }

        // Rediriger vers la page d'accueil
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Erreur inattendue lors du callback:", err);
        setError("Une erreur inattendue s'est produite. Redirection...");
        setTimeout(() => navigate("/"), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-400 via-pink-500 via-purple-500 to-indigo-600">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
        {error ? (
          <>
            <div className="text-red-600 mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-lg font-semibold">{error}</p>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-mint animate-spin" />
            <h2 className="text-xl font-semibold text-graphite mb-2">
              Connexion en cours...
            </h2>
            <p className="text-gray-medium">
              Veuillez patienter pendant que nous finalisons votre connexion.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

