import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { Lock, CheckCircle2, ArrowLeft } from "lucide-react";
import { SEOHead } from "@/components/seo";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier si on a une session de réinitialisation valide
    // Attendre un peu pour laisser le temps à authBootstrap de finir
    const checkSession = async () => {
      // Attendre 500ms pour laisser le temps à authBootstrap d'échanger le code
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      } else {
        // Vérifier dans l'URL si on a un hash avec code ou access_token
        const hash = window.location.hash;
        if (hash.includes("code=") || hash.includes("access_token=") || hash.includes("type=recovery")) {
          // Laisser Supabase gérer la session depuis l'URL
          // Réessayer après un délai supplémentaire
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            setIsValidSession(!!retrySession);
          }, 1000);
        } else {
          setIsValidSession(false);
        }
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!password || !confirmPassword) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        let errorMessage = updateError.message;
        if (updateError.message.includes("session")) {
          errorMessage = "Le lien de réinitialisation a expiré ou n'est plus valide. Veuillez demander un nouveau lien.";
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Succès
      setSuccess(true);
      setError(null);
      
      // Rediriger vers la connexion après 2 secondes
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue s'est produite");
      setLoading(false);
    }
  };

  // Afficher un message si la session n'est pas valide
  if (isValidSession === false) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-400 via-pink-500 via-purple-500 to-indigo-600 relative overflow-hidden">
        <SEOHead
          title="Lien invalide"
          description="Réinitialisation du mot de passe"
          noindex={true}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.1),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.08),transparent_50%)] pointer-events-none" />
        
        <div className="relative z-10">
          <LogoHeader />
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
          <Card className="w-full max-w-md bg-white shadow-sm border border-gray-light rounded-2xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-semibold text-graphite">
                Lien invalide ou expiré
              </CardTitle>
              <CardDescription className="text-gray-medium mt-2">
                Ce lien de réinitialisation n'est plus valide ou a expiré.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
                <p>Veuillez demander un nouveau lien depuis la page de connexion.</p>
              </div>
              <PrimaryButton
                onClick={() => navigate("/forgot-password")}
                className="w-full rounded-2xl bg-mint hover:bg-mint-dark text-white font-medium shadow-sm transition-all duration-200 ease-out"
              >
                Demander un nouveau lien
              </PrimaryButton>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-sm text-gray-medium hover:text-mint transition-colors duration-200 flex items-center justify-center gap-2 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la connexion
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Afficher un loader pendant la vérification de session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-400 via-pink-500 via-purple-500 to-indigo-600">
        <SEOHead
          title="Vérification en cours"
          description="Réinitialisation du mot de passe"
          noindex={true}
        />
        <div className="text-white">Vérification en cours...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-400 via-pink-500 via-purple-500 to-indigo-600 relative overflow-hidden">
      <SEOHead
        title="Nouveau mot de passe"
        description="Réinitialisation du mot de passe"
        noindex={true}
      />
      {/* Pattern overlay subtil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.1),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.08),transparent_50%)] pointer-events-none" />
      
      <div className="relative z-10">
        <LogoHeader />
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <Card className="w-full max-w-md bg-white shadow-sm border border-gray-light rounded-2xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-semibold text-graphite">
              Nouveau mot de passe
            </CardTitle>
            <CardDescription className="text-gray-medium mt-2">
              Définissez un nouveau mot de passe pour votre compte
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700 text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Mot de passe modifié avec succès !</p>
                      <p>Vous allez être redirigé vers la page de connexion...</p>
                    </div>
                  </div>
                </div>
                <PrimaryButton
                  onClick={() => navigate("/")}
                  className="w-full rounded-2xl bg-mint hover:bg-mint-dark text-white font-medium shadow-sm transition-all duration-200 ease-out"
                >
                  Se connecter
                </PrimaryButton>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nouveau mot de passe */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-medium">Nouveau mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={8}
                    className="rounded-2xl border-gray-light focus:border-mint focus:ring-mint"
                  />
                  <p className="text-xs text-gray-medium">Minimum 8 caractères</p>
                </div>

                {/* Confirmation */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-medium">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={8}
                    className="rounded-2xl border-gray-light focus:border-mint focus:ring-mint"
                  />
                </div>

                {/* Message d'erreur */}
                {error && (
                  <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Bouton de soumission */}
                <PrimaryButton 
                  type="submit" 
                  disabled={loading} 
                  className="w-full rounded-2xl bg-mint hover:bg-mint-dark text-white font-medium shadow-sm transition-all duration-200 ease-out disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Modification en cours...
                    </span>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Modifier le mot de passe
                    </>
                  )}
                </PrimaryButton>
              </form>
            )}

            {/* Retour à la connexion */}
            {!success && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-sm text-gray-medium hover:text-mint transition-colors duration-200 flex items-center justify-center gap-2 mx-auto"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la connexion
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;

