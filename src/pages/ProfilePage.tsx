import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, User, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { Profile } from "@/types/profile";
import { PersonalInfoSection } from "@/components/profile/PersonalInfoSection";
import { EducationSection } from "@/components/profile/EducationSection";
import { ExperienceSection } from "@/components/profile/ExperienceSection";
import { ProjectsSection } from "@/components/profile/ProjectsSection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { InterestsSection } from "@/components/profile/InterestsSection";
import { CollapsibleSection } from "@/components/profile/CollapsibleSection";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

interface ProfilePageProps {
  userId: string;
}

const ProfilePage = ({ userId }: ProfilePageProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Récupérer l'utilisateur authentifié depuis Supabase
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      } else {
        console.error("Aucun utilisateur authentifié");
        setError("Vous devez être connecté pour accéder à votre profil");
        setLoading(false);
      }
    };
    getCurrentUser();
  }, []);

  /**
   * Charge le profil depuis Supabase
   * Les colonnes JSONB sont automatiquement converties en objets JavaScript par Supabase
   */
  const loadProfile = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      setError(null);

      console.log("Chargement du profil pour l'utilisateur:", currentUserId);

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .single();

      if (fetchError) {
        // Si le profil n'existe pas (code PGRST116), on crée un profil vide
        if (fetchError.code === "PGRST116") {
          console.log("Profil non trouvé, création d'un profil vide");
          const newProfile: Profile = {
            id: currentUserId,
            first_name: null,
            last_name: null,
            city: null,
            target_role: null,
            experience_level: null,
            created_at: new Date().toISOString(),
            email: null,
            phone: null,
            linkedin: null,
            availability: null,
          education: [],
          experiences: [],
          projects: [],
          languages: [],
          hardSkills: [],
          softSkills: [],
          interests: [],
          activities: [],
          };
          setProfile(newProfile);
          return;
        }
        console.error("Erreur lors du chargement du profil:", fetchError);
        setError(fetchError.message);
        return;
      }

      if (!data) {
        console.log("Aucune donnée retournée, création d'un profil vide");
        const newProfile: Profile = {
          id: currentUserId,
          first_name: null,
          last_name: null,
          city: null,
          target_role: null,
          experience_level: null,
          created_at: new Date().toISOString(),
          email: null,
          phone: null,
          linkedin: null,
          availability: null,
          education: [],
          experiences: [],
          projects: [],
          languages: [],
          hardSkills: [],
          softSkills: [],
          interests: [],
          activities: [],
        };
        setProfile(newProfile);
        return;
      }

      // Conversion des données Supabase vers le type Profile
      // Les colonnes JSONB sont déjà des objets JavaScript, pas besoin de JSON.parse
      // Mapper snake_case (Supabase) vers camelCase (TypeScript)
      const loadedProfile: Profile = {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        city: data.city,
        target_role: data.target_role,
        experience_level: data.experience_level,
        created_at: data.created_at || new Date().toISOString(),
        email: data.email || null,
        phone: data.phone || null,
        linkedin: data.linkedin || null,
        availability: data.availability || null,
        // Les colonnes JSONB sont déjà des arrays/objets, utiliser array vide si null ou non-array
        education: Array.isArray(data.education) ? data.education : [],
        experiences: Array.isArray(data.experiences) ? data.experiences : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        languages: Array.isArray(data.languages) ? data.languages : [],
        hardSkills: Array.isArray(data.hard_skills) ? data.hard_skills : [],
        softSkills: Array.isArray(data.soft_skills) ? data.soft_skills : [],
        interests: Array.isArray(data.interests) ? data.interests : [],
        activities: Array.isArray(data.activities) ? data.activities : [],
      };

      console.log("Profil chargé avec succès:", loadedProfile);
      setProfile(loadedProfile);
    } catch (err) {
      console.error("Erreur lors du chargement du profil:", err);
      setError(err instanceof Error ? err.message : "Une erreur s'est produite");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      loadProfile();
    }
  }, [currentUserId, loadProfile]);

  /**
   * Met à jour le profil local (state React)
   */
  const handleProfileUpdate = (updates: Partial<Profile>) => {
    if (!profile) return;
    setProfile({ ...profile, ...updates });
  };

  /**
   * Sauvegarde le profil dans Supabase
   * Utilise upsert pour créer ou mettre à jour le profil
   * Les colonnes JSONB acceptent directement les arrays JavaScript
   */
  const saveProfile = async () => {
    if (!profile || !currentUserId) {
      console.error("Impossible de sauvegarder: profil ou utilisateur manquant");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSaveStatus(null);

      console.log("Sauvegarde du profil pour l'utilisateur:", currentUserId);

      // Préparer les données pour Supabase
      // Les colonnes JSONB acceptent directement les arrays/objets JavaScript
      // Mapper camelCase (TypeScript) vers snake_case (Supabase)
      const profileData: any = {
        id: currentUserId,
        first_name: profile.first_name || null,
        last_name: profile.last_name || null,
        city: profile.city || null,
        target_role: profile.target_role || null,
        experience_level: profile.experience_level || null,
        email: profile.email || null,
        phone: profile.phone || null,
        linkedin: profile.linkedin || null,
        // Les colonnes JSONB acceptent directement les arrays, utiliser array vide si undefined
        education: Array.isArray(profile.education) ? profile.education : [],
        experiences: Array.isArray(profile.experiences) ? profile.experiences : [],
        projects: Array.isArray(profile.projects) ? profile.projects : [],
        languages: Array.isArray(profile.languages) ? profile.languages : [],
        hard_skills: Array.isArray(profile.hardSkills) ? profile.hardSkills : [],
        soft_skills: Array.isArray(profile.softSkills) ? profile.softSkills : [],
        interests: Array.isArray(profile.interests) ? profile.interests : [],
        activities: Array.isArray(profile.activities) ? profile.activities : [],
      };

      // Ajouter availability seulement si elle existe dans le schéma
      // (pour éviter l'erreur PGRST204 si la colonne n'existe pas encore)
      // Vous pouvez décommenter cette ligne après avoir exécuté le script SQL fix_availability_column.sql
      // profileData.availability = profile.availability || null;

      // Ne pas inclure created_at dans l'upsert si le profil existe déjà
      // (laisser Supabase gérer la date de création)

      console.log("Données à sauvegarder:", JSON.stringify(profileData, null, 2));

      // Utiliser upsert pour créer ou mettre à jour le profil
      // Si upsert échoue, essayer avec insert/update séparément
      let result;
      let upsertError;
      
      const { data: upsertData, error: upsertErr } = await supabase
        .from("profiles")
        .upsert(profileData, {
          onConflict: "id",
        })
        .select()
        .single();

      if (upsertErr) {
        console.warn("Upsert a échoué, tentative avec insert/update séparément:", upsertErr);
        upsertError = upsertErr;
        
        // Essayer avec update d'abord
        const { id, ...updateData } = profileData;
        const { data: updateDataResult, error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", currentUserId)
          .select()
          .single();
        
        if (updateError) {
          // Si update échoue, essayer insert
          console.log("Update a échoué, tentative avec insert");
          const { data: insertData, error: insertError } = await supabase
            .from("profiles")
            .insert(profileData)
            .select()
            .single();
          
          if (insertError) {
            console.error("Insert a également échoué:", insertError);
            throw insertError;
          }
          result = insertData;
        } else {
          result = updateDataResult;
        }
      } else {
        result = upsertData;
      }

      if (!result) {
        throw new Error("Aucune donnée retournée après la sauvegarde");
      }

      console.log("Profil sauvegardé avec succès:", result);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde du profil:", err);
      
      // Extraire le message d'erreur détaillé
      let errorMessage = "Erreur lors de la sauvegarde";
      if (err) {
        if (err.message) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        }
        
        // Ajouter des détails supplémentaires si disponibles
        if (err.code) {
          errorMessage += ` (Code: ${err.code})`;
        }
        if (err.details) {
          errorMessage += ` - ${err.details}`;
        }
        if (err.hint) {
          errorMessage += ` - ${err.hint}`;
        }
      }
      
      setError(errorMessage);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ultra-light">
        <LogoHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-mint" />
            <p className="text-gray-dark">Chargement du profil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-ultra-light">
        <LogoHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="w-full max-w-md bg-white shadow-sm border border-gray-light rounded-2xl p-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => navigate("/")}
                className="text-mint hover:text-mint-dark transition-colors duration-200"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-ultra-light">
        <LogoHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="w-full max-w-md bg-white shadow-sm border border-gray-light rounded-2xl p-6">
            <div className="text-center">
              <p className="text-gray-dark mb-4">Profil non trouvé</p>
              <button
                onClick={() => navigate("/")}
                className="text-mint hover:text-mint-dark transition-colors duration-200"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ultra-light relative">
      {/* Bordures colorées subtiles sur les côtés */}
      <div className="fixed left-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-rose-400 via-pink-500 via-purple-500 to-indigo-600 z-0 pointer-events-none" />
      <div className="fixed right-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-rose-400 via-pink-500 via-purple-500 to-indigo-600 z-0 pointer-events-none" />
      
      <div className="relative z-10">
        <LogoHeader />
      </div>
      
      <div className="px-6 py-8 max-w-4xl mx-auto relative z-10">
        {/* En-tête avec titre et bouton de sauvegarde */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-mint-light rounded-2xl p-3 border border-mint/30">
              <User className="w-6 h-6 text-mint-dark" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-graphite">Mon profil</h1>
              <p className="text-sm text-gray-medium mt-1">
                Complétez votre CV en ligne
              </p>
            </div>
          </div>

          {/* Bouton de sauvegarde avec feedback */}
          <button
            onClick={saveProfile}
            disabled={saving}
            className={`px-6 py-3 rounded-2xl font-medium shadow-sm transition-all duration-200 ease-out flex items-center gap-2 ${
              saveStatus === "success"
                ? "bg-green-500 text-white"
                : saveStatus === "error"
                ? "bg-red-500 text-white"
                : "bg-mint text-white hover:bg-mint-dark"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : saveStatus === "success" ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Enregistré !
              </>
            ) : saveStatus === "error" ? (
              <>
                <AlertCircle className="w-5 h-5" />
                Erreur
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer les modifications
              </>
            )}
          </button>
        </div>

        {/* Message d'erreur global */}
        {error && saveStatus === "error" && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Sections du profil */}
        <div className="space-y-6">
          <CollapsibleSection title="Informations personnelles" defaultOpen>
            <PersonalInfoSection profile={profile} onUpdate={handleProfileUpdate} />
          </CollapsibleSection>
          
          <CollapsibleSection title="Formation">
            <EducationSection profile={profile} onUpdate={handleProfileUpdate} />
          </CollapsibleSection>
          
          <CollapsibleSection title="Expériences professionnelles">
            <ExperienceSection profile={profile} onUpdate={handleProfileUpdate} />
          </CollapsibleSection>
          
          <CollapsibleSection title="Projets">
            <ProjectsSection profile={profile} onUpdate={handleProfileUpdate} />
          </CollapsibleSection>
          
          <CollapsibleSection title="Compétences & Langues">
            <SkillsSection profile={profile} onUpdate={handleProfileUpdate} />
          </CollapsibleSection>
          
          <CollapsibleSection title="Centres d'intérêt & Activités">
            <InterestsSection profile={profile} onUpdate={handleProfileUpdate} />
          </CollapsibleSection>
        </div>

        {/* Section Paramètres du compte / Zone de danger */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <CollapsibleSection title="Paramètres du compte" defaultOpen={false}>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                <h3 className="font-semibold text-red-800 mb-2">Zone de danger</h3>
                <p className="text-sm text-red-700 mb-4">
                  La suppression de votre compte est définitive. Toutes vos données seront supprimées et ne pourront pas être récupérées.
                </p>
                <DeleteAccountButton />
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Bouton de sauvegarde en bas de page (mobile) */}
        <div className="mt-8 pb-8">
          <button
            onClick={saveProfile}
            disabled={saving}
            className={`w-full px-6 py-4 rounded-2xl font-medium shadow-sm transition-all duration-200 ease-out flex items-center justify-center gap-2 ${
              saveStatus === "success"
                ? "bg-green-500 text-white"
                : saveStatus === "error"
                ? "bg-red-500 text-white"
                : "bg-mint text-white hover:bg-mint-dark"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : saveStatus === "success" ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Enregistré !
              </>
            ) : saveStatus === "error" ? (
              <>
                <AlertCircle className="w-5 h-5" />
                Erreur lors de l'enregistrement
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer les modifications
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
