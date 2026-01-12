import { useState, useEffect, useRef } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ArrowLeft, Download, FileText, PenTool, Mail, Phone, MapPin, Globe, CheckCircle2 } from "lucide-react";
import { CVPreview } from "@/components/CVPreview";

interface GeneratedDocumentViewProps {
  cvData?: { pdf: string; content: any };
  clData?: { pdf: string; content: any };
  onBack: () => void;
  jobTitle: string;
  companyName: string;
  userProfile?: any;
  initialTab?: 'cv' | 'cl';
}

export const GeneratedDocumentView = ({ cvData, clData, onBack, jobTitle, companyName, userProfile, initialTab }: GeneratedDocumentViewProps) => {
  const [activeTab, setActiveTab] = useState<'cv' | 'cl'>(initialTab || (cvData ? 'cv' : 'cl'));
  const previewRef = useRef<HTMLDivElement>(null);

  // Scroll to top when activeTab changes or component mounts
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [activeTab]);

  const downloadPdf = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderCoverLetter = (content: any) => {
    if (!content) {
        return <div className="p-8 text-center text-slate-500">Contenu de la lettre non disponible.</div>;
    }

    // Fallback pour le header de la lettre
    const header = content.header_blocks || {};
    const fullname = header.fullname_block || (userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : "Nom Prénom");
    const email = header.email_block || userProfile?.email;
    const phone = header.phone_block || userProfile?.phone;
    const location = header.location_block || userProfile?.city;

    return (
    <div className="w-full max-w-[21cm] mx-auto bg-white shadow-2xl min-h-[29.7cm] p-[2.5cm] text-slate-800 font-serif text-[11pt] leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className="flex justify-between items-start mb-16 text-sm">
        <div className="space-y-1.5 text-slate-700">
          <div className="font-bold text-lg text-slate-900 uppercase tracking-wide mb-2">{fullname}</div>
          {location && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {location}</div>}
          {email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {email}</div>}
          {phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {phone}</div>}
          {header.websites_block && <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> {header.websites_block}</div>}
        </div>
        
        <div className="text-left space-y-1.5 mt-8 min-w-[250px]">
          <div className="font-bold text-lg text-slate-900">{content.company_blocks?.company_name_block}</div>
          {content.company_blocks?.contact_block && <div className="text-slate-600">{content.company_blocks.contact_block}</div>}
          <div className="whitespace-pre-line text-slate-600">{content.company_blocks?.company_address_block}</div>
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col items-end mb-12">
         <div className="text-slate-600 italic">
            {content.place_date_line}
         </div>
      </div>
      
      {/* Object */}
      <div className="mb-8">
        <span className="font-bold text-slate-900">Objet : </span>
        <span className="font-medium text-slate-800">{content.objet_line?.replace(/^Objet\s*:\s*/i, '')}</span>
      </div>

      {/* Body */}
      <div className="space-y-6 text-justify text-slate-700 leading-7">
        <p>{content.greeting}</p>
        {[content.para1, content.para2, content.para3, content.para4].filter(Boolean).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        <div className="mt-16 flex justify-end">
            <div className="text-center min-w-[200px]">
                <div className="font-bold text-slate-900 mb-4">{content.signature}</div>
            </div>
        </div>
      </div>
    </div>
  )};

  return (
    <div className="min-h-screen bg-slate-100/50 relative flex flex-col">
       {/* Background */}
       <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-slate-100 -z-10" />

       {/* Top Bar */}
       <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="font-bold text-slate-800 text-lg">Candidature : {companyName}</h1>
                <p className="text-xs text-slate-500">{jobTitle}</p>
            </div>
          </div>
          <div className="flex gap-2">
             <PrimaryButton 
                onClick={() => {
                    if (activeTab === 'cv' && cvData) downloadPdf(cvData.pdf, `CV_${companyName}.pdf`);
                    if (activeTab === 'cl' && clData) downloadPdf(clData.pdf, `Lettre_${companyName}.pdf`);
                }}
                className="shadow-lg shadow-indigo-200"
            >
                <Download className="w-4 h-4 mr-2" />
                Télécharger {activeTab === 'cv' ? 'CV' : 'Lettre'}
            </PrimaryButton>
          </div>
       </header>

       <main className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 hidden md:flex">
             <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Documents</div>
             
             {cvData && (
                <button
                    onClick={() => setActiveTab('cv')}
                    className={`flex items-center p-3 rounded-xl transition-all text-left ${activeTab === 'cv' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${activeTab === 'cv' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-medium">CV Optimisé</div>
                        <div className="text-xs opacity-70">Prêt à l'envoi</div>
                    </div>
                    {activeTab === 'cv' && <CheckCircle2 className="w-4 h-4 ml-auto text-indigo-600" />}
                </button>
             )}

             {clData && (
                <button
                    onClick={() => setActiveTab('cl')}
                    className={`flex items-center p-3 rounded-xl transition-all text-left ${activeTab === 'cl' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${activeTab === 'cl' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-medium">Lettre de Motiv.</div>
                        <div className="text-xs opacity-70">Personnalisée</div>
                    </div>
                    {activeTab === 'cl' && <CheckCircle2 className="w-4 h-4 ml-auto text-indigo-600" />}
                </button>
             )}
          </aside>

          {/* Document Preview Area */}
          <div ref={previewRef} className="flex-1 overflow-y-auto bg-slate-100/50 p-4 md:p-8 flex justify-center">
             <div className="w-full max-w-[21cm] transition-all duration-300 ease-in-out transform">
                {activeTab === 'cv' && cvData ? <CVPreview content={cvData.content} /> : null}
                {activeTab === 'cl' && clData ? renderCoverLetter(clData.content) : null}
             </div>
          </div>
       </main>
    </div>
  );
};