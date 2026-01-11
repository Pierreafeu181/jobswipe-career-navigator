import React, { useState, useEffect } from 'react';

interface UserData {
  identity: { firstname: string; lastname: string; email: string; phone: string; city: string; gender: string; handicap: string };
  links: { linkedin: string; portfolio: string };
  documents: { 
    cv_base64: string; cv_name: string; cv_type: string;
    cover_letter_text: string;
    cover_letter_base64: string; cover_letter_name: string; cover_letter_type: string;
  };
  ai_responses: { why_us: string; salary_expectations: string };
  structured_cv?: {
    cv_title?: string;
    objective?: string;
    experiences?: any[];
    education?: any[];
    skills?: {
      sections?: { section_title: string; items: string[] }[];
      highlighted?: string[];
    };
    interests?: any[];
    projects?: any[];
  };
}

const INITIAL_DATA: UserData = {
  identity: { firstname: "", lastname: "", email: "", phone: "", city: "", gender: "", handicap: "" },
  links: { linkedin: "", portfolio: "" },
  documents: { cv_base64: "", cv_name: "", cv_type: "", cover_letter_text: "", cover_letter_base64: "", cover_letter_name: "", cover_letter_type: "" },
  ai_responses: { why_us: "", salary_expectations: "" },
  structured_cv: undefined
};

const Popup: React.FC = () => {
  const [formData, setFormData] = useState<UserData>(INITIAL_DATA);
  const [status, setStatus] = useState<string>("Prêt à postuler");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [activeTab, setActiveTab] = useState<"info" | "cv" | "docs" | "actions">("info");
  const [apiKey, setApiKey] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Chargement initial
    chrome.storage.local.get(['jobswipe_user_data', 'gemini_api_key'], (result) => {
      if (result.jobswipe_user_data) setFormData(result.jobswipe_user_data);
      if (result.gemini_api_key) setApiKey(result.gemini_api_key);
    });

    // Écoute des changements (Push depuis le site)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.jobswipe_user_data) {
        setFormData(changes.jobswipe_user_data.newValue);
        const hasCV = !!changes.jobswipe_user_data.newValue.structured_cv;
        setStatus(hasCV ? "Profil et CV structuré reçus !" : "Profil mis à jour depuis le site !");
        setStatusType("success");
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleChange = (section: keyof UserData, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleFileChange = (docType: 'cv' | 'cover_letter') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setStatus("Le document doit être un PDF");
        setStatusType("error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [`${docType}_base64`]: event.target?.result as string,
            [`${docType}_name`]: file.name,
            [`${docType}_type`]: file.type
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadFile = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = () => {
    chrome.storage.local.set({ jobswipe_user_data: formData, gemini_api_key: apiKey }, () => {
      setStatus("Infos sauvegardées !");
      setStatusType("success");
      setTimeout(() => setStatus("Prêt à postuler"), 2000);
    });
  };

  // Fonction pour trouver la frame (cadre) qui contient le plus de champs de formulaire
  // Utile pour les sites comme Workday qui utilisent des iframes
  const findBestFrame = async (tabId: number) => {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: () => document.querySelectorAll('input:not([type="hidden"]), textarea, select').length
      });
      const best = results.reduce((max, curr) => (curr.result || 0) > (max.result || 0) ? curr : max, results[0]);
      return best?.frameId || 0;
    } catch (e) {
      return 0; // Fallback sur la frame principale en cas d'erreur
    }
  };

  const handleAnalyze = async () => {
    if (apiKey) {
      setStatus("IA : Analyse du formulaire...");
      setStatusType("info");

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          // Détecter la meilleure frame avant d'envoyer le message
          const frameId = await findBestFrame(tab.id);
          chrome.tabs.sendMessage(
            tab.id,
            { action: "scan_form_context" },
            { frameId }, // Cibler la frame spécifique
            async (response: any) => {
              if (chrome.runtime.lastError || !response?.context) {
                setStatus("Erreur lecture page");
                setStatusType("error");
                return;
              }

              try {
                const prompt = `
                  Tu es un expert en analyse de formulaires de recrutement.
                  Voici les champs détectés sur la page : ${JSON.stringify(response.context)}
                  
                  Analyse ces champs et liste brièvement les informations demandées (ex: Identité, CV, Lettre, Questions sur le visa, etc.).
                  Sois concis (max 15 mots).
                `;

                const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                const data = await apiRes.json();
                if (!apiRes.ok) throw new Error(data.error?.message || "Erreur API");

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                setStatus(text ? `IA : ${text.trim()}` : "IA : Rien détecté");
                setStatusType(text ? "success" : "error");
              } catch (e) {
                setStatus("Erreur analyse IA");
                setStatusType("error");
              }
            }
          );
        }
      } catch (e) {
        setStatus("Erreur technique");
        setStatusType("error");
      }
      return;
    }

    setStatus("Analyse du formulaire...");
    setStatusType("info");

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab?.id) {
        const frameId = await findBestFrame(tab.id);
        chrome.tabs.sendMessage(
          tab.id,
          { action: "analyze_form" },
          { frameId },
          (response: any) => {
            if (chrome.runtime.lastError) {
              setStatus("Erreur : Rechargez la page");
              setStatusType("error");
            } else if (response && response.fields) {
              const count = response.fields.length;
              if (count > 0) {
                  const readable = response.fields.map((f: string) => {
                      if(f === 'firstname') return 'Prénom';
                      if(f === 'lastname') return 'Nom';
                      if(f === 'email') return 'Email';
                      if(f === 'phone') return 'Téléphone';
                      if(f === 'city') return 'Ville';
                      if(f === 'gender') return 'Genre';
                      if(f === 'handicap') return 'Handicap';
                      if(f === 'linkedin') return 'LinkedIn';
                      if(f === 'portfolio') return 'Portfolio';
                      if(f === 'salary') return 'Salaire';
                      if(f === 'cv') return 'CV';
                      if(f === 'cover_letter') return 'Lettre (PDF)';
                      if(f === 'cover_letter_text') return 'Lettre (Txt)';
                      if(f === 'why_us') return 'Pourquoi nous?';
                      return f;
                  }).join(', ');
                  setStatus(`Trouvé : ${readable}`);
                  setStatusType("success");
              } else {
                  setStatus("Aucun champ détecté");
                  setStatusType("error");
              }
            }
          }
        );
      }
    } catch (error) {
      setStatus("Erreur technique");
      setStatusType("error");
    }
  };

  const handleAIFill = async () => {
    if (!apiKey) {
      setStatus("Clé API manquante (voir paramètres)");
      setStatusType("error");
      setShowSettings(true);
      return;
    }

    setStatus("IA : Analyse du formulaire...");
    setStatusType("info");
    setWarnings([]);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      // 1. Détecter la frame contenant le formulaire
      const frameId = await findBestFrame(tab.id);

      // 2. Récupérer le contexte du formulaire dans cette frame
      chrome.tabs.sendMessage(tab.id, { action: "scan_form_context" }, { frameId }, async (response: any) => {
        if (chrome.runtime.lastError || !response?.context) {
          setStatus("Erreur lecture page");
          setStatusType("error");
          return;
        }

        if (response.context.length === 0) {
          setStatus("Aucun champ détecté (iframe ?)");
          setStatusType("error");
          return;
        }

        try {
          // 2. Appeler Gemini
          setStatus("IA : Réflexion en cours...");
          
          const prompt = `
            Tu es un assistant de remplissage de formulaire.
            Voici les données de l'utilisateur : ${JSON.stringify(formData)}
            Voici les champs du formulaire web : ${JSON.stringify(response.context)}
            
            Ta tâche : Générer un plan d'exécution JSON pour remplir ce formulaire.
            
            Fonctions disponibles :
            1. fill_text(selector, value): Pour les champs texte, email, tel, textarea.
            2. select_option(selector, value): Pour les menus déroulants <select>. 'value' doit être le texte de l'option.
            3. toggle_check(selector, checked): Pour les cases à cocher (checked: true/false).
            4. select_radio(selector): Pour cliquer sur un bouton radio spécifique.
            5. upload_file(selector, file_type): Pour les fichiers. file_type doit être "cv" ou "cover_letter".
            
            Règles de décision :
            1. **Données présentes** : Si l'information est dans les données utilisateur, utilise-la pour remplir le champ.
            2. **Données manquantes (Critique)** : Si une information précise et importante est demandée (ex: Numéro de sécurité sociale, Permis spécifique) et qu'elle n'est PAS dans les données utilisateur, NE REMPLIS PAS le champ et ajoute un message dans "warnings".
            3. **Questions générales / Secondaires** : Si c'est une question générale (ex: "Êtes-vous autorisé à travailler ?", "Genre", "Comment avez-vous entendu parler de nous ?") ou subjective, déduis la réponse la plus probable à partir du profil (ex: "Oui" pour autorisation si nationalité correspond, "LinkedIn" pour source) ou laisse vide si trop incertain, mais privilégie le remplissage.
            4. **Motivation** : Pour les champs "Pourquoi nous ?", utilise le champ 'why_us' des données ou génère une phrase pertinente.
            
            Format de réponse (JSON uniquement) :
            { 
              "plan": [ { "function": "nom_fonction", "selector": "...", "args": { ... } } ],
              "warnings": ["Champ 'Permis de conduire' ignoré (donnée manquante)", ...]
            }
          `;

          const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });

          const data = await apiRes.json();

          if (!apiRes.ok) {
            throw new Error(data.error?.message || `Erreur API (${apiRes.status})`);
          }

          let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (!text) {
            if (data.promptFeedback?.blockReason) throw new Error(`Bloqué: ${data.promptFeedback.blockReason}`);
            throw new Error("Pas de réponse de l'IA");
          }
          
          // Nettoyage du JSON (au cas où l'IA mettrait des backticks)
          text = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const result = JSON.parse(text);

          if (result.warnings && Array.isArray(result.warnings)) {
            setWarnings(result.warnings);
          }

          // 3. Appliquer le mapping dans la bonne frame
          chrome.tabs.sendMessage(tab.id!, { action: "execute_ai_plan", plan: result.plan, userData: formData }, { frameId }, (res) => {
             const count = res?.count || 0;
             if (result.warnings && result.warnings.length > 0) {
                setStatus(`Rempli (${count} champs). Voir avertissements.`);
                setStatusType("info");
             } else {
                setStatus(`IA : ${count} champs remplis !`);
                setStatusType("success");
             }
          });

        } catch (e) {
          console.error(e);
          setStatus(e instanceof Error ? e.message : "Erreur IA");
          setStatusType("error");
        }
      });
    } catch (e) {
      setStatus("Erreur technique");
      setStatusType("error");
    }
  };

  const handleScanOffer = async () => {
    setStatus("Scan de l'offre...");
    setStatusType("info");
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: "scan_job_offer" }, (response) => {
          if (chrome.runtime.lastError || !response) {
             setStatus("Erreur scan");
             setStatusType("error");
          } else {
             const offerData = response.data;
             chrome.storage.local.set({ scanned_job_offer: offerData }, () => {
                setStatus("Offre scannée !");
                setStatusType("success");
             });
          }
        });
      }
    } catch (e) {
      setStatus("Erreur technique");
      setStatusType("error");
    }
  };

  const openSite = () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  };

  return (
    <div className="p-4 bg-gray-50 text-gray-800 min-h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-mint-dark">JobSwipe</h1>
        <button onClick={() => setShowSettings(!showSettings)} className="text-xs text-gray-500 underline">
          {showSettings ? "Fermer" : "Paramètres"}
        </button>
      </div>
      
      {showSettings && (
        <div className="mb-4 p-3 bg-white rounded border border-gray-200">
          <label className="text-xs font-bold block mb-1">Clé API Gemini</label>
          <input 
            type="password" 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
            className="w-full p-1 border rounded text-xs" 
            placeholder="Collez votre clé API ici"
          />
          <p className="text-[10px] text-gray-400 mt-1">Nécessaire pour le remplissage intelligent.</p>
        </div>
      )}
      
      <div className="flex mb-4 border-b border-gray-200">
        <button 
          className={`flex-1 py-2 text-sm font-medium transition-all hover:scale-105 cursor-pointer ${activeTab === 'info' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('info')}
        >
          Infos
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium transition-all hover:scale-105 cursor-pointer ${activeTab === 'cv' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('cv')}
        >
          CV
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium transition-all hover:scale-105 cursor-pointer ${activeTab === 'docs' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('docs')}
        >
          Documents
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium transition-all hover:scale-105 cursor-pointer ${activeTab === 'actions' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('actions')}
        >
          Postuler
        </button>
      </div>

      <div className="space-y-3 mb-4">
        {activeTab === 'info' && (
          <>
            <input type="text" placeholder="Prénom" className="w-full p-2 border rounded text-sm" value={formData.identity.firstname} onChange={(e) => handleChange('identity', 'firstname', e.target.value)} />
            <input type="text" placeholder="Nom" className="w-full p-2 border rounded text-sm" value={formData.identity.lastname} onChange={(e) => handleChange('identity', 'lastname', e.target.value)} />
            <input type="email" placeholder="Email" className="w-full p-2 border rounded text-sm" value={formData.identity.email} onChange={(e) => handleChange('identity', 'email', e.target.value)} />
            <input type="tel" placeholder="Téléphone" className="w-full p-2 border rounded text-sm" value={formData.identity.phone} onChange={(e) => handleChange('identity', 'phone', e.target.value)} />
            <input type="text" placeholder="Ville" className="w-full p-2 border rounded text-sm" value={formData.identity.city} onChange={(e) => handleChange('identity', 'city', e.target.value)} />
            
            <select 
              className="w-full p-2 border rounded text-sm bg-white"
              value={formData.identity.gender} 
              onChange={(e) => handleChange('identity', 'gender', e.target.value)}
            >
              <option value="">Genre (Non spécifié)</option>
              <option value="M">Homme</option>
              <option value="F">Femme</option>
              <option value="NB">Non-binaire</option>
            </select>

            <div className="space-y-1 pt-1">
              <label className="text-xs font-medium text-gray-700 block">Situation de handicap</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" name="handicap" value="Oui" checked={formData.identity.handicap === "Oui"} onChange={(e) => handleChange('identity', 'handicap', e.target.value)} /> Oui
                </label>
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" name="handicap" value="Non" checked={formData.identity.handicap === "Non"} onChange={(e) => handleChange('identity', 'handicap', e.target.value)} /> Non
                </label>
              </div>
            </div>

            <input type="url" placeholder="LinkedIn URL" className="w-full p-2 border rounded text-sm" value={formData.links.linkedin} onChange={(e) => handleChange('links', 'linkedin', e.target.value)} />
            <input type="url" placeholder="Portfolio URL" className="w-full p-2 border rounded text-sm" value={formData.links.portfolio} onChange={(e) => handleChange('links', 'portfolio', e.target.value)} />
            <input type="text" placeholder="Prétentions salariales" className="w-full p-2 border rounded text-sm" value={formData.ai_responses.salary_expectations} onChange={(e) => handleChange('ai_responses', 'salary_expectations', e.target.value)} />
            <textarea placeholder="Pourquoi nous ?" className="w-full p-2 border rounded text-sm h-20" value={formData.ai_responses.why_us} onChange={(e) => handleChange('ai_responses', 'why_us', e.target.value)} />
          </>
        )}

        {activeTab === 'cv' && (
          formData.structured_cv ? (
            <div className="space-y-4 text-xs">
              <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                <h3 className="font-bold text-indigo-700 mb-1">Titre & Objectif</h3>
                <p className="font-semibold mb-1">{formData.structured_cv.cv_title}</p>
                <p className="text-gray-600 italic leading-relaxed">{formData.structured_cv.objective}</p>
              </div>

              {formData.structured_cv.experiences && formData.structured_cv.experiences.length > 0 && (
                <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-indigo-700 mb-2">Expériences</h3>
                  <div className="space-y-3">
                    {formData.structured_cv.experiences.map((exp: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between font-semibold">
                          <span>{exp.target_title || exp.source_title}</span>
                          <span className="text-gray-500 text-[10px] whitespace-nowrap ml-2">{exp.start_date} - {exp.end_date}</span>
                        </div>
                        <div className="text-indigo-600 mb-1">{exp.company}</div>
                        <ul className="list-disc pl-3 text-gray-600 space-y-0.5 marker:text-gray-400">
                          {exp.bullets?.map((b: string, j: number) => <li key={j}>{b}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.structured_cv.education && formData.structured_cv.education.length > 0 && (
                <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-indigo-700 mb-2">Formation</h3>
                  <div className="space-y-2">
                    {formData.structured_cv.education.map((edu: any, i: number) => (
                      <div key={i}>
                        <div className="font-semibold">{edu.degree}</div>
                        <div className="flex justify-between text-gray-600">
                          <span>{edu.school}</span>
                          <span className="text-[10px]">{edu.start_date} - {edu.end_date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.structured_cv.skills && (
                <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-indigo-700 mb-2">Compétences</h3>
                  <div className="space-y-2">
                    {formData.structured_cv.skills.sections?.map((section: any, i: number) => (
                      <div key={i}>
                        <span className="font-semibold text-gray-800">{section.section_title}: </span>
                        <span className="text-gray-600">{section.items.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {formData.structured_cv.interests && formData.structured_cv.interests.length > 0 && (
                <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-indigo-700 mb-2">Intérêts</h3>
                  <ul className="space-y-1">
                    {formData.structured_cv.interests.map((int: any, i: number) => (
                      <li key={i} className="text-gray-600">
                        <span className="font-semibold text-gray-800">{int.label}</span>
                        {int.sentence && <span>: {int.sentence}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8 text-xs">
              <p className="mb-2">Aucune donnée CV structurée.</p>
              <p>Générez un CV sur le site et cliquez sur "Envoyer vers l'extension".</p>
            </div>
          )
        )}

        {activeTab === 'docs' && (
          <>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-700">CV (PDF)</label>
                {formData.documents.cv_base64 && (
                  <button 
                    onClick={() => downloadFile(formData.documents.cv_base64, formData.documents.cv_name || 'cv.pdf')}
                    className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-200 transition-colors"
                  >
                    Télécharger
                  </button>
                )}
              </div>
              <input 
                type="file" 
                accept="application/pdf"
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                onChange={handleFileChange('cv')}
              />
              {formData.documents.cv_name && (
                <p className="text-xs text-green-600 truncate">Actuel: {formData.documents.cv_name}</p>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-700">Lettre de motivation (PDF)</label>
                {formData.documents.cover_letter_base64 && (
                  <button 
                    onClick={() => downloadFile(formData.documents.cover_letter_base64, formData.documents.cover_letter_name || 'lettre_motivation.pdf')}
                    className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-200 transition-colors"
                  >
                    Télécharger
                  </button>
                )}
              </div>
              <input 
                type="file" 
                accept="application/pdf"
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                onChange={handleFileChange('cover_letter')}
              />
              {formData.documents.cover_letter_name && (
                <p className="text-xs text-green-600 truncate">Actuel: {formData.documents.cover_letter_name}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Lettre de motivation (Texte)</label>
              <textarea 
                placeholder="Madame, Monsieur..."
                className="w-full p-2 border rounded text-sm h-32"
                value={formData.documents.cover_letter_text}
                onChange={(e) => handleChange('documents', 'cover_letter_text', e.target.value)}
              />
            </div>
          </>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-4">
            {status === "Site introuvable." && (
              <button onClick={openSite} className="w-full bg-indigo-50 text-indigo-700 py-2 rounded text-xs font-semibold hover:bg-indigo-100 transition-colors border border-indigo-200">
                Ouvrir l'app (Localhost)
              </button>
            )}

            <div className="flex gap-2">
              <button 
                onClick={handleAnalyze}
                className="w-full bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold py-3 px-2 rounded transition-all text-xs flex items-center justify-center gap-1 hover:scale-105 cursor-pointer"
              >
                <span>🔍</span> Analyser page
              </button>
            </div>

            <button 
              onClick={handleScanOffer}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-2 rounded transition-all text-sm hover:scale-105 cursor-pointer flex items-center justify-center gap-2 shadow-md"
            >
              <span>📋</span> Scanner l'offre (pour le site)
            </button>

            <button 
              onClick={handleAIFill}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-2 rounded transition-all text-sm hover:scale-105 cursor-pointer flex items-center justify-center gap-2 shadow-md"
            >
              <span>✨</span> Remplir le formulaire (IA)
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button 
          onClick={handleSave}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-2 rounded transition-all text-sm hover:scale-105 cursor-pointer"
        >
          Sauvegarder
        </button>
      </div>
      
      <div className={`mt-3 p-2 rounded text-xs text-center font-medium ${
        statusType === 'success' ? 'bg-green-100 text-green-800' :
        statusType === 'error' ? 'bg-red-100 text-red-800' :
        'bg-blue-50 text-blue-800'
      }`}>
        {status}
      </div>
      
      {warnings.length > 0 && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <p className="font-bold mb-1">⚠️ Attention :</p>
          <ul className="list-disc pl-4 space-y-1">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Popup;
