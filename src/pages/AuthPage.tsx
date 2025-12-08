import { useState } from "react";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { LogIn, UserPlus } from "lucide-react";
import { Chrome } from "lucide-react";

type AuthMode = "login" | "signup";

const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Champs communs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Champs spécifiques à l'inscription
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation des champs
      if (!email || !password || !firstName || !lastName || !city || !targetRole || !experienceLevel) {
        setError("Veuillez remplir tous les champs");
        setLoading(false);
        return;
      }

      // Inscription avec Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        let errorMessage = authError.message;
        if (authError.message.includes('trop de temps') || authError.message.includes('timeout')) {
          errorMessage = "L'inscription prend trop de temps. Vérifiez votre connexion internet et réessayez.";
        } else if (authError.message.includes('User already registered')) {
          errorMessage = "Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.";
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Erreur lors de la création du compte");
        setLoading(false);
        return;
      }

      // Création du profil dans la table profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          city: city,
          target_role: targetRole,
          experience_level: experienceLevel,
        });

      if (profileError) {
        setError(`Erreur lors de la création du profil: ${profileError.message}`);
        setLoading(false);
        return;
      }

      // Succès - la session sera mise à jour automatiquement via onAuthStateChange
      setError(null);
    } catch (err) {
      // Gestion spécifique des erreurs de timeout
      if (err instanceof Error) {
        if (err.message.includes('trop de temps') || err.message.includes('timeout') || err.message.includes('AbortError')) {
          setError("L'inscription prend trop de temps. Vérifiez votre connexion internet et réessayez.");
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setError("Problème de connexion réseau. Vérifiez votre connexion internet.");
        } else {
          setError(err.message || "Une erreur inattendue s'est produite");
        }
      } else {
        setError("Une erreur inattendue s'est produite");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Messages d'erreur plus clairs pour l'utilisateur
        let errorMessage = signInError.message;
        if (signInError.message.includes('Invalid login credentials')) {
          errorMessage = "Email ou mot de passe incorrect";
        } else if (signInError.message.includes('trop de temps') || signInError.message.includes('timeout')) {
          errorMessage = "La connexion prend trop de temps. Vérifiez votre connexion internet et réessayez.";
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Succès - la session sera mise à jour automatiquement via onAuthStateChange
      setError(null);
    } catch (err) {
      // Gestion spécifique des erreurs de timeout
      if (err instanceof Error) {
        if (err.message.includes('trop de temps') || err.message.includes('timeout') || err.message.includes('AbortError')) {
          setError("La connexion prend trop de temps. Vérifiez votre connexion internet et réessayez.");
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setError("Problème de connexion réseau. Vérifiez votre connexion internet.");
        } else {
          setError(err.message || "Une erreur inattendue s'est produite");
        }
      } else {
        setError("Une erreur inattendue s'est produite");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
      // Note: La redirection se fait automatiquement, donc on ne reset pas le loading ici
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue s'est produite");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-400 via-pink-500 via-purple-500 to-indigo-600 relative overflow-hidden">
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
              {mode === "login" ? "Connexion" : "Inscription"}
            </CardTitle>
            <CardDescription className="text-gray-medium mt-2">
              {mode === "login" 
                ? "Connectez-vous à votre compte" 
                : "Créez votre compte pour commencer"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Bouton Google - visible en mode login et signup */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleSignInWithGoogle}
                disabled={loading || googleLoading}
                className="w-full px-6 py-3 rounded-2xl border-2 border-gray-light bg-white text-gray-dark hover:bg-gray-50 hover:border-gray-medium transition-all duration-200 ease-out flex items-center justify-center gap-3 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-medium border-t-transparent rounded-full animate-spin" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <Chrome className="w-5 h-5" />
                    <span>Se connecter avec Google</span>
                  </>
                )}
              </button>
            </div>

            {/* Séparateur */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-light"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-medium">ou</span>
              </div>
            </div>

            <form onSubmit={mode === "login" ? handleSignIn : handleSignUp} className="space-y-4">
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

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-medium">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  minLength={6}
                  className="rounded-2xl border-gray-light focus:border-mint focus:ring-mint"
                />
              </div>

              {/* Champs spécifiques à l'inscription */}
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-medium">Prénom</Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jean"
                        required
                        disabled={loading}
                        className="rounded-2xl border-gray-light focus:border-mint focus:ring-mint"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-medium">Nom</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Dupont"
                        required
                        disabled={loading}
                        className="rounded-2xl border-gray-light focus:border-mint focus:ring-mint"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-medium">Ville</Label>
                    <Input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Paris"
                      required
                      disabled={loading}
                      className="rounded-2xl border-gray-light focus:border-mint focus:ring-mint"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetRole" className="text-gray-medium">Rôle ciblé</Label>
                    <Input
                      id="targetRole"
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="Développeur Full Stack"
                      required
                      disabled={loading}
                      className="rounded-2xl border-gray-light focus:border-mint focus:ring-mint"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experienceLevel" className="text-gray-medium">Niveau d'expérience</Label>
                    <Input
                      id="experienceLevel"
                      type="text"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      placeholder="Junior, Confirmé, Senior..."
                      required
                      disabled={loading}
                      className="rounded-2xl border-gray-light focus:border-mint focus:ring-mint"
                    />
                  </div>
                </>
              )}

              {/* Message d'erreur */}
              {error && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Bouton de soumission */}
              <PrimaryButton 
                type="submit" 
                disabled={loading || googleLoading} 
                className="w-full rounded-2xl bg-mint hover:bg-mint-dark text-white font-medium shadow-sm transition-all duration-200 ease-out disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Connexion en cours...
                  </span>
                ) : mode === "login" ? (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Se connecter
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    S'inscrire
                  </>
                )}
              </PrimaryButton>
            </form>

            {/* Basculer entre connexion et inscription */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError(null);
                }}
                className="text-sm text-gray-medium hover:text-mint transition-colors duration-200"
                disabled={loading}
              >
                {mode === "login" 
                  ? "Pas encore de compte ? S'inscrire" 
                  : "Déjà un compte ? Se connecter"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;

