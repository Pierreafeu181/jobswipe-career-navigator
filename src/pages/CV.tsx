import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { loadProfile } from "@/lib/storage";
import { ArrowRight, Download } from "lucide-react";
import { SEOHead } from "@/components/seo";

const CV = () => {
  const navigate = useNavigate();
  const profile = loadProfile();

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SEOHead
          title="Mon CV"
          description="Génération de CV"
          noindex={true}
        />
        <LogoHeader />
        <div className="px-6 py-8 max-w-2xl mx-auto text-center">
          <p className="text-slate-600 mb-4">Veuillez d'abord compléter votre profil</p>
          <PrimaryButton onClick={() => navigate("/profil")}>
            Aller au profil
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/50 pb-12">
      <SEOHead
        title="Mon CV"
        description="Génération de CV"
        noindex={true}
      />
      <LogoHeader />
      
      <div className="px-4 py-8 flex justify-center">
        <div className="w-full max-w-[21cm] bg-white shadow-2xl min-h-[29.7cm] p-[2.5cm] text-slate-800 text-sm leading-normal font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="border-b-2 border-slate-800 pb-6 mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 uppercase tracking-tight mb-2">
                            {profile.firstName} {profile.lastName}
                        </h1>
                    </div>
                    <div className="text-right text-xs text-slate-600 space-y-1 max-w-[250px]">
                        <div className="whitespace-pre-line">{profile.contact}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Expériences */}
                {profile.experiences && (
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                            Expériences Professionnelles
                        </h3>
                        <div className="whitespace-pre-line text-slate-700 leading-relaxed text-justify">
                            {profile.experiences}
                        </div>
                    </section>
                )}

                {/* Formations */}
                {profile.formations && (
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                            Formation
                        </h3>
                        <div className="whitespace-pre-line text-slate-700 leading-relaxed text-justify">
                            {profile.formations}
                        </div>
                    </section>
                )}

                {/* Compétences */}
                {profile.competences && (
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                            Compétences
                        </h3>
                        <div className="whitespace-pre-line text-slate-700 leading-relaxed text-justify">
                            {profile.competences}
                        </div>
                    </section>
                )}
            </div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 flex gap-4">
        <PrimaryButton onClick={() => window.print()} className="shadow-xl bg-slate-800 hover:bg-slate-700 w-auto px-6">
            <Download className="w-5 h-5 mr-2" />
            Imprimer / PDF
        </PrimaryButton>
        <PrimaryButton onClick={() => navigate("/jobswipe/offres")} className="shadow-xl w-auto px-6">
            Suivant
            <ArrowRight className="w-5 h-5 ml-2" />
        </PrimaryButton>
      </div>
    </div>
  );
};

export default CV;
