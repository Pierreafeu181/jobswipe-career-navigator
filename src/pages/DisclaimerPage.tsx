import React from 'react';
import { LogoHeader } from "@/components/LogoHeader";
import { BrainCircuit, ShieldCheck } from 'lucide-react';

interface DisclaimerPageProps {
  onAccept: () => void;
}

const DisclaimerPage: React.FC<DisclaimerPageProps> = ({ onAccept }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Background gradients */}
      <div className="fixed left-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-violet-200 via-purple-200 to-indigo-200 opacity-50 blur-3xl z-0 pointer-events-none" />
      <div className="fixed right-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-blue-200 via-indigo-200 to-violet-200 opacity-50 blur-3xl z-0 pointer-events-none" />
      
      <div className="relative z-10">
        <LogoHeader />
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-2xl bg-white/80 backdrop-blur-lg shadow-xl border border-slate-100 rounded-2xl p-8 text-center">
          
          <div className="mx-auto w-16 h-16 mb-6 bg-indigo-100 border-2 border-indigo-200 rounded-full flex items-center justify-center">
            <BrainCircuit className="w-8 h-8 text-indigo-600" />
          </div>

          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            Utilisation de l'Intelligence Artificielle
          </h1>
          
          <p className="text-slate-600 leading-relaxed mb-6">
            Pour vous offrir la meilleure expérience possible, JobSwipe utilise des technologies d'Intelligence Artificielle, notamment le modèle Gemini de Google.
          </p>

          <div className="space-y-4 text-left bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="bg-white p-2 rounded-lg shadow-sm mt-1">
                <BrainCircuit className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Génération par IA</h3>
                <p className="text-sm text-slate-600">
                  Certains contenus, comme les CV optimisés et les lettres de motivation, sont générés par une IA pour correspondre au mieux aux offres d'emploi.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-white p-2 rounded-lg shadow-sm mt-1">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Confidentialité de vos données</h3>
                <p className="text-sm text-slate-600">
                  Pour fonctionner, les données de votre profil et des offres que vous consultez sont envoyées à l'API de Gemini. Nous nous engageons à <strong className="font-semibold">ne pas utiliser vos données à des fins commerciales</strong> ou pour entraîner des modèles d'IA.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={onAccept}
              className="w-full max-w-xs mx-auto px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium shadow-lg hover:shadow-xl hover:bg-indigo-700 hover:scale-105 cursor-pointer transition-all duration-200 ease-out"
            >
              J'ai compris, continuer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerPage;