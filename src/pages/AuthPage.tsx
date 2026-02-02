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
import { SEOHead } from "@/components/seo";

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
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
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
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      <SEOHead
        title={mode === "login" ? "Connexion" : "Inscription"}
        description={mode === "login"
          ? "Connectez-vous à votre compte JobSwipe pour accéder à vos offres personnalisées"
          : "Créez votre compte JobSwipe et commencez votre recherche d'emploi d'ingénieur"}
        noindex={true}
      />
      {/* Bordures colorées subtiles sur les côtés */}
      <div className="fixed left-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-violet-200 via-purple-200 to-indigo-200 opacity-50 blur-3xl z-0 pointer-events-none" />
      <div className="fixed right-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-blue-200 via-indigo-200 to-violet-200 opacity-50 blur-3xl z-0 pointer-events-none" />
      
      <div className="relative z-10">
        <LogoHeader />
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <Card className="w-full max-w-md bg-white shadow-xl border border-slate-100 rounded-2xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-semibold text-slate-800">
              {mode === "login" ? "Connexion" : "Inscription"}
            </CardTitle>
            <CardDescription className="text-slate-500 mt-2">
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
                className="w-full px-6 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:scale-[1.02] cursor-pointer transition-all duration-200 ease-out flex items-center justify-center gap-3 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
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
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-400">ou</span>
              </div>
            </div>

            <form onSubmit={mode === "login" ? handleSignIn : handleSignUp} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-600">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  disabled={loading}
                  className="rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-600">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  minLength={6}
                  className="rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
                {mode === "login" && (
                  <div className="text-right">
                    <a
                      href="#/forgot-password"
                      className="text-xs text-gray-medium hover:text-mint transition-colors duration-200"
                    >
                      Mot de passe oublié ?
                    </a>
                  </div>
                )}
              </div>

              {/* Champs spécifiques à l'inscription */}
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-slate-600">Prénom</Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jean"
                        required
                        disabled={loading}
                        className="rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-slate-600">Nom</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Dupont"
                        required
                        disabled={loading}
                        className="rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-slate-600">Ville</Label>
                    <Input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Paris"
                      required
                      disabled={loading}
                      className="rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetRole" className="text-slate-600">Rôle ciblé</Label>
                    <Input
                      id="targetRole"
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="Développeur Full Stack"
                      required
                      disabled={loading}
                      className="rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experienceLevel" className="text-slate-600">Niveau d'expérience</Label>
                    <Input
                      id="experienceLevel"
                      type="text"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      placeholder="Junior, Confirmé, Senior..."
                      required
                      disabled={loading}
                      className="rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
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
                className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] cursor-pointer transition-all duration-200 ease-out disabled:opacity-70 disabled:cursor-not-allowed"
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
                className="text-sm text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors duration-200"
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
