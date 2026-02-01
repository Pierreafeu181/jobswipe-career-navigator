import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { Mail, ArrowLeft } from "lucide-react";
import { SEOHead } from "@/components/seo";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      if (!email) {
        setError("Veuillez saisir votre adresse email");
        setLoading(false);
        return;
      }

      const redirectTo = "https://pierreafeu181.github.io/jobswipe-career-navigator/#/reset-password";
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        let errorMessage = resetError.message;
        if (resetError.message.includes("rate limit")) {
          errorMessage = "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.";
        } else if (resetError.message.includes("not found")) {
          errorMessage = "Aucun compte n'est associé à cet email.";
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Succès
      setSuccess(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue s'est produite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-400 via-pink-500 via-purple-500 to-indigo-600 relative overflow-hidden">
      <SEOHead
        title="Mot de passe oublié"
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
              Mot de passe oublié
            </CardTitle>
            <CardDescription className="text-gray-medium mt-2">
              Entrez votre adresse email pour recevoir un lien de réinitialisation
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700 text-sm">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Email envoyé !</p>
                      <p>
                        Si un compte existe avec l'adresse <strong>{email}</strong>, 
                        vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
                      </p>
                    </div>
                  </div>
                </div>
                <PrimaryButton
                  onClick={() => navigate("/")}
                  className="w-full rounded-2xl bg-mint hover:bg-mint-dark text-white font-medium shadow-sm transition-all duration-200 ease-out"
                >
                  Retour à la connexion
                </PrimaryButton>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    disabled={loading}
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
                      Envoi en cours...
                    </span>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      Envoyer le lien
                    </>
                  )}
                </PrimaryButton>
              </form>
            )}

            {/* Retour à la connexion */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-sm text-gray-medium hover:text-mint transition-colors duration-200 flex items-center justify-center gap-2"
                disabled={loading}
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
};

export default ForgotPassword;

