// Logique d'injection et de matching pour JobSwipe

/**
 * Simule une saisie humaine dans un champ
 * Utilise execCommand pour une compatibilité maximale ou les événements natifs
 */
const simulateHumanTyping = async (element, text) => {
  element.focus();
  
  // Méthode 1: execCommand (déprécié mais très efficace pour simuler l'utilisateur)
  const success = document.execCommand('insertText', false, text);
  
  // Méthode 2: Fallback sur les événements natifs si execCommand échoue
  if (!success) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    nativeInputValueSetter.call(element, text);
    
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);
    
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);
  }
  
  element.blur();
  
  // Délai pour éviter la détection anti-bot (50ms)
  await new Promise(resolve => setTimeout(resolve, 50));
};

const injectFile = async (field, base64, name, type) => {
    try {
        // Convert Base64 to Blob/File
        const res = await fetch(base64);
        const blob = await res.blob();
        const file = new File([blob], name, { type: type });
        
        // Create DataTransfer to set files property
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        field.files = dataTransfer.files;
        
        const changeEvent = new Event('change', { bubbles: true });
        field.dispatchEvent(changeEvent);
        field.style.backgroundColor = "#e6fffa";
        return true;
    } catch (e) {
        console.error("JobSwipe: Error injecting file", e);
        return false;
    }
};

/**
 * Identifie le type d'un champ de formulaire
 */
const getFieldType = (field) => {
    if (field.type === 'hidden' || field.disabled || field.readOnly) return null;
    
    const attributes = (field.name + " " + field.id + " " + (field.placeholder || "") + " " + (field.labels?.[0]?.innerText || "")).toLowerCase();

    // --- File Input (CV & Cover Letter) ---
    if (field.type === 'file') {
        if ((attributes.includes('cv') || attributes.includes('resume') || attributes.includes('upload')) && !attributes.includes('cover') && !attributes.includes('lettre')) return 'cv';
        if (attributes.includes('cover') || attributes.includes('motivation') || attributes.includes('lettre')) return 'cover_letter';
        return null;
    }

    // --- Text Inputs & Textareas ---
    if (attributes.includes('email') || attributes.includes('mail') || field.type === 'email') return 'email';
    if (attributes.includes('phone') || attributes.includes('tel') || attributes.includes('mobile') || attributes.includes('portable')) return 'phone';
    if (attributes.includes('city') || attributes.includes('ville') || attributes.includes('location') || attributes.includes('adresse')) return 'city';
    if (attributes.includes('gender') || attributes.includes('genre') || attributes.includes('sexe') || attributes.includes('civilite')) return 'gender';
    if (attributes.includes('handicap') || attributes.includes('disability') || attributes.includes('rqth')) return 'handicap';
    if ((attributes.includes('first') && attributes.includes('name')) || attributes.includes('prenom')) return 'firstname';
    if ((attributes.includes('last') && attributes.includes('name')) || attributes.includes('nom') || attributes.includes('surname')) return 'lastname';
    if (attributes.includes('linkedin')) return 'linkedin';
    if (attributes.includes('portfolio') || attributes.includes('website') || attributes.includes('site')) return 'portfolio';
    
    if (attributes.includes('salary') || attributes.includes('salaire') || attributes.includes('pretention')) return 'salary';

    if (field.tagName === 'TEXTAREA') {
        if (attributes.includes('cover') || attributes.includes('motivation') || attributes.includes('lettre')) return 'cover_letter_text';
        if (attributes.includes('why') || attributes.includes('pourquoi')) return 'why_us';
    }
    
    // Fallback pour les champs texte qui pourraient être une lettre de motivation
    if (attributes.includes('cover') || attributes.includes('motivation') || attributes.includes('lettre')) return 'cover_letter_text';

    return null;
};

/**
 * Scanne le formulaire pour extraire le contexte pour l'IA
 */
const getFormContext = () => {
  const inputs = document.querySelectorAll('input, textarea, select');
  const fields = [];
  
  inputs.forEach((el) => {
    if (el.type === 'hidden' || el.disabled || el.readOnly) return;
    
    // Récupération du label
    let label = "";
    if (el.labels && el.labels.length > 0) {
      label = Array.from(el.labels).map(l => l.innerText).join(" ");
    } else if (el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl) label = labelEl.innerText;
    }
    
    // Fallback sur aria-label ou placeholder
    if (!label) label = el.getAttribute('aria-label') || el.placeholder || "";
    label = label.replace(/\s+/g, ' ').trim();

    // Génération d'un sélecteur unique
    let selector = "";
    if (el.id) selector = `#${el.id}`;
    else if (el.name) selector = `[name="${el.name}"]`;
    else {
        if (!el.hasAttribute('data-js-ai-id')) {
            el.setAttribute('data-js-ai-id', Math.random().toString(36).substr(2, 9));
        }
        selector = `[data-js-ai-id="${el.getAttribute('data-js-ai-id')}"]`;
    }

    fields.push({
      selector: selector,
      type: el.type,
      tag: el.tagName.toLowerCase(),
      label: label,
      name: el.name || "",
      placeholder: el.placeholder || "",
      inferred_type: getFieldType(el),
      options: el.tagName.toLowerCase() === 'select' ? Array.from(el.options).map(o => o.text).slice(0, 50) : undefined
    });
  });
  
  return fields;
};

const tools = {
    fill_text: async (el, args) => {
        if (args.value) {
            await simulateHumanTyping(el, args.value);
            el.style.backgroundColor = "#e6fffa";
            return true;
        }
        return false;
    },
    upload_file: async (el, args, userData) => {
        const docType = args.file_type; // 'cv' or 'cover_letter'
        if (userData.documents && userData.documents[`${docType}_base64`]) {
            return await injectFile(
                el, 
                userData.documents[`${docType}_base64`],
                userData.documents[`${docType}_name`],
                userData.documents[`${docType}_type`]
            );
        }
        return false;
    },
    select_option: async (el, args) => {
        const val = args.value;
        if (!val) return false;
        
        let found = false;
        // Recherche exacte ou partielle dans les options
        for (let i = 0; i < el.options.length; i++) {
            const opt = el.options[i];
            if (opt.value === val || opt.text === val || opt.text.toLowerCase().includes(val.toLowerCase())) {
                el.selectedIndex = i;
                found = true;
                break;
            }
        }
        
        if (found) {
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.style.backgroundColor = "#e6fffa";
            return true;
        }
        return false;
    },
    toggle_check: async (el, args) => {
        const shouldCheck = args.checked === true || args.checked === 'true';
        if (el.checked !== shouldCheck) {
            el.click();
            if (el.checked !== shouldCheck) el.checked = shouldCheck; // Force si le click échoue
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.parentElement.style.backgroundColor = "#e6fffa";
            return true;
        }
        return false;
    },
    select_radio: async (el) => {
        if (!el.checked) {
            el.click();
            el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            if (el.parentElement) el.parentElement.style.backgroundColor = "#e6fffa";
            return true;
        }
        return false;
    }
};

const executeAIPlan = async (plan, userData) => {
  let count = 0;
  if (!plan || !Array.isArray(plan)) return 0;

  for (const action of plan) {
    const el = document.querySelector(action.selector);
    if (!el) continue;

    const tool = tools[action.function];
    if (tool) {
        try {
            const success = await tool(el, action.args || {}, userData);
            if (success) count++;
        } catch (e) {
            console.error(`JobSwipe: Error executing ${action.function}`, e);
        }
    }
  }
  return count;
};

/**
 * Analyse le formulaire et retourne les champs détectés
 */
const analyzeForm = () => {
    const inputs = document.querySelectorAll('input, textarea, select');
    const detected = [];
    for (const field of inputs) {
        const type = getFieldType(field);
        if (type) detected.push(type);
    }
    return [...new Set(detected)]; // Retourne les types uniques trouvés
};

/**
 * Trouve et remplit les champs du formulaire
 */
const findAndFill = async (data) => {
  const inputs = document.querySelectorAll('input, textarea, select');
  let filledCount = 0;

  for (const field of inputs) {
    const type = getFieldType(field);
    if (!type) continue;

    let valueToInject = null;
    let fileToInject = null;

    switch (type) {
        case 'email': valueToInject = data.identity.email; break;
        case 'phone': valueToInject = data.identity.phone; break;
        case 'city': valueToInject = data.identity.city; break;
        case 'gender': valueToInject = data.identity.gender; break;
        case 'handicap': valueToInject = data.identity.handicap; break;
        case 'firstname': valueToInject = data.identity.firstname; break;
        case 'lastname': valueToInject = data.identity.lastname; break;
        case 'linkedin': valueToInject = data.links.linkedin; break;
        case 'portfolio': valueToInject = data.links.portfolio; break;
        case 'salary': valueToInject = data.ai_responses.salary_expectations; break;
        case 'why_us': valueToInject = data.ai_responses.why_us; break;
        case 'cover_letter_text': valueToInject = data.documents.cover_letter_text; break;
        case 'cv': 
            if (data.documents?.cv_base64) fileToInject = { base64: data.documents.cv_base64, name: data.documents.cv_name, type: data.documents.cv_type };
            break;
        case 'cover_letter':
            if (data.documents?.cover_letter_base64) fileToInject = { base64: data.documents.cover_letter_base64, name: data.documents.cover_letter_name, type: data.documents.cover_letter_type };
            break;
    }

    // --- Injection ---
    if (fileToInject) {
        if (await injectFile(field, fileToInject.base64, fileToInject.name, fileToInject.type)) {
            filledCount++;
        }
    } else if (valueToInject) {
      // Ne pas écraser si déjà rempli (sauf si c'est court/vide)
      if (!field.value || field.value.length < 2) {
        await simulateHumanTyping(field, valueToInject);
        filledCount++;
        // Petit effet visuel pour confirmer l'injection
        field.style.backgroundColor = "#e6fffa"; 
        field.style.transition = "background-color 0.5s";
      }
    }
  }

  return filledCount;
};

const scanJobOffer = () => {
    // 1. Titre : H1 > OG:Title > Title
    let title = document.querySelector('h1')?.innerText;
    if (!title) title = document.querySelector('meta[property="og:title"]')?.content;
    if (!title) title = document.title;

    // Nettoyage basique du texte pour éviter d'envoyer trop de bruit
    const description = (document.body.innerText || "").replace(/\s+/g, ' ').substring(0, 10000).trim(); 
    const url = window.location.href;
    
    // 3. Entreprise : OG:Site_Name > Meta Author > Fallback vide
    let company = document.querySelector('meta[property="og:site_name"]')?.content;
    if (!company) company = document.querySelector('meta[name="author"]')?.content;
    
    return { title: title || "", description, url, company: company || "" };
};

// Écouteur de messages venant du Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fill_form") {
    findAndFill(request.data)
      .then(count => {
        sendResponse({ status: "success", count: count });
      })
      .catch(err => {
        console.error("JobSwipe Error:", err);
        sendResponse({ status: "error", message: err.message });
      });
    
    // Indique que la réponse est asynchrone
    return true;
  }
  
  if (request.action === "analyze_form") {
    const fields = analyzeForm();
    sendResponse({ fields });
    return false;
  }

  if (request.action === "scan_form_context") {
    const context = getFormContext();
    sendResponse({ context });
    return false;
  }

  if (request.action === "execute_ai_plan") {
    executeAIPlan(request.plan, request.userData).then(c => sendResponse({ count: c }));
    return true;
  }

  if (request.action === "scan_job_offer") {
      const data = scanJobOffer();
      sendResponse({ data });
      return false;
  }
});

// Écouteur pour les messages venant de la page web (Site JobSwipe)
// Permet au site d'injecter des données dans l'extension via window.postMessage
window.addEventListener("message", (event) => {
  // Sécurité : on vérifie que le message vient de la même fenêtre
  if (event.source !== window) return;

  if (event.data && event.data.type === "JOBSWIPE_SYNC_PROFILE") {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ jobswipe_user_data: event.data.payload }, () => {
          if (chrome.runtime.lastError) {
            console.error("JobSwipe Extension Storage Error:", chrome.runtime.lastError.message);
          } else {
            console.log("JobSwipe Extension: Profil et Documents (PDF) synchronisés avec succès.");
          }
        });
      } else {
        console.warn("JobSwipe Extension: chrome.storage.local non disponible. Rechargez la page ou l'extension.");
      }
    } catch (e) {
      console.error("JobSwipe Extension Exception:", e);
    }
  }

  if (event.data && event.data.type === "JOBSWIPE_REQUEST_OFFER") {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['scanned_job_offer'], (result) => {
              if (result.scanned_job_offer) {
                  window.postMessage({
                      type: "JOBSWIPE_OFFER_DATA",
                      payload: result.scanned_job_offer
                  }, "*");
              } else {
                  console.warn("JobSwipe: Aucune offre scannée trouvée.");
                  window.postMessage({ type: "JOBSWIPE_OFFER_DATA", payload: null }, "*");
              }
          });
      }
  }
});

console.log("JobSwipe Content Script Loaded");