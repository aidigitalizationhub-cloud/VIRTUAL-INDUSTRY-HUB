import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Comprehensive dictionary for instant word-for-word translation across pages and dynamic items
export const TRANSLATION_DICTIONARY: Record<string, Record<string, string>> = {
  fr: {
    // --- NEWS HEADINGS & SUMMARIES ---
    "UG Researchers Develop Low-Cost Diagnostic Kit for Dengue Fever": "Des chercheurs de l'UG développent un kit de diagnostic à bas coût pour la dengue",
    "A pioneering research team at the Noguchi Memorial Institute for Medical Research has designed an affordable and fast diagnostic assay format suitable for West African rural clinics, bypassing cold-chain requirements and utilizing local biological materials.": "Une équipe de recherche pionnière à l'Institut Mémorial Noguchi pour la recherche médicale a conçu un format de test de diagnostic abordable et rapide adapté aux cliniques rurales d'Afrique de l'Ouest, contournant les exigences de la chaîne du froid et utilisant des matériaux biologiques locaux.",
    
    "WACCBIP Identifies Novel Genomic Variants of Malaria Parasites across Legon Ecosystem": "Le WACCBIP identifie de nouveaux variants génomiques de parasites du paludisme dans l'écosystème de Legon",
    "Investigators at the West African Centre for Cell Biology of Infectious Pathogens (WACCBIP) have resolved key novel genomic escape mutations. This breakthrough helps engineers build highly immunogenic target sequences for upcoming trial formulations.": "Les chercheurs du Centre ouest-africain de biologie cellulaire des agents pathogènes infectieux (WACCBIP) ont résolu d'importantes nouvelles mutations d'échappement génomique. Cette percée aide les ingénieurs à créer des séquences cibles hautement immunogènes pour les prochaines formulations d'essais.",
    
    "Phase II Clinical Trials Authorized for University Phytopharma Anti-inflammatory": "Essais cliniques de phase II autorisés pour l'anti-inflammatoire phytopharmaceutique de l'Université",
    "University of Ghana's School of Pharmacy gains official regulatory authorization to advance clinical evaluation of a local phytomedicine formulation shown to relieve chronic inflammation in advanced clinical trials.": "L'École de pharmacie de l'Université du Ghana obtient l'autorisation réglementaire officielle pour faire progresser l'évaluation clinique d'une formulation locale de phytomédecine démontrée pour soulager l'inflammation chronique lors d'essais cliniques avancés.",
    
    "UG IEP Launchpad Project Incubates Three New Medical-Tech Student Spin-offs": "Le projet Launchpad UG IEP incube trois nouvelles spin-offs étudiantes en technologie médicale",
    "The University of Ghana Innovation and Entrepreneurship Programme (UGIEP) announces milestone mentorship and seed funding, fostering local research commercialization for student-led biotech startups.": "Le programme d'innovation et d'entrepreneuriat de l'Université du Ghana (UGIEP) annonce un mentorat et un financement de démarrage décisifs, favorisant la commercialisation de la recherche locale pour les startups biotechnologiques dirigées par des étudiants.",

    // --- NEWS PAGE UI ---
    "Discovery & Industry News": "Actualités de la Découverte & de l'Industrie",
    "University of Ghana • Virtual Industry Hub": "Université du Ghana • Hub Industriel Virtuel",
    "Monitoring research outputs, commercial spin-offs, partnerships, and global innovation trends.": "Suivi des résultats de recherche, des spin-offs commerciales, des partenariats et des tendances mondiales de l'innovation.",
    "Monitoring university research outputs, commercial spin-offs, strategic partnerships, and global innovation trends.": "Suivi des résultats de recherche universitaire, des spin-offs commerciales, des partenariats stratégiques et des tendances mondiales de l'innovation.",
    "Search news, grants, breakthroughs...": "Rechercher des actualités, subventions, découvertes...",
    "Filter: All Discovery": "Filtrer : Toutes les Découvertes",
    "Announcements": "Annonces",
    "Grants & Funding": "Subventions & Financements",
    "Partnerships": "Partenariats",
    "Research Releases": "Publications de Recherche",
    "Ecosystem Updates": "Mises à jour de l'Écosystème",
    "Announcement": "Annonce",
    "Grant Opportunity": "Opportunité de Subvention",
    "Strategic Partnership": "Partenariat Stratégique",
    "Research Release": "Publication de Recherche",
    "Read Briefing": "Lire le Briefing",
    "Source": "Source",
    "Load More News": "Charger plus d'actualités",
    "Loading Discoveries...": "Chargement des découvertes...",
    "No news items found": "Aucune actualité trouvée",
    "Try clearing your search words or category filter.": "Essayez d'effacer vos mots de recherche ou le filtre de catégorie.",
    "Reset Filters": "Réinitialiser les filtres",
    "Synced:": "Synchronisé :",
    "Back to News": "Retour aux actualités",
    "Full Research & News Briefing": "Briefing complet sur la recherche et l'actualité",
    "Share News": "Partager l'actualité",
    "Verified Institutional Source": "Source institutionnelle vérifiée",
    "Institutional Verification": "Vérification institutionnelle",
    "Key Topics & Semantic Tags": "Sujets clés et balises sémantiques",
    "External Reference": "Référence externe",
    "Visit Official Announcement": "Visiter l'annonce officielle",
    "News Curator Workspace": "Espace de travail du conservateur d'actualités",

    // --- PROJECTS PAGE UI & DATA ---
    "Research Projects & IP Disclosures": "Projets de Recherche & Divulgations PI",
    "Discover University of Ghana's breakthroughs, patent filings, and commercialization opportunities.": "Découvrez les percées, les dépôts de brevets et les opportunités de commercialisation de l'Université du Ghana.",
    "Search research projects & disclosures...": "Rechercher des projets de recherche et divulgations...",
    "Filter by Category": "Filtrer par catégorie",
    "Commercialization Stage": "Stade de commercialisation",
    "Public Disclosures": "Divulgations publiques",
    "View Project Details": "Voir les détails du projet",
    "Contact Researcher": "Contacter le chercheur",
    "Add to Watchlist": "Ajouter à la liste de veille",
    "Remove from Watchlist": "Retirer de la liste de veille",
    "Technology Readiness Level": "Niveau de maturité technologique (TRL)",
    "TRL Stage": "Niveau TRL",
    "Abstract": "Résumé",
    "Lead Investigator": "Chercheur principal",
    "Department / Institute": "Département / Institut",
    "Intellectual Property Status": "Statut de la propriété intellectuelle",
    "Commercial Opportunity": "Opportunité commerciale",
    "Request Collaboration / License": "Demander une collaboration / licence",

    // --- PRODUCTS PAGE UI & DATA ---
    "Market-Ready Products & Technologies": "Produits & Technologies Prêts pour le Marché",
    "Explore commercial-grade technologies, assays, and products ready for industry adoption.": "Explorez des technologies, tests et produits de qualité commerciale prêts pour l'adoption par l'industrie.",
    "Search commercial products...": "Rechercher des produits commerciaux...",
    "Commercial Terms": "Conditions commerciales",
    "View Tech Details": "Voir les détails techniques",
    "Industry Solutions": "Solutions industrielles",

    // --- DASHBOARD UI & CARDS ---
    "Overview": "Aperçu",
    "My Matches": "Mes Correspondances",
    "Messages": "Messages",
    "Profile": "Profil",
    "Settings": "Paramètres",
    "Industry Challenges": "Défis Industriels",
    "IP Disclosures": "Divulgations PI",
    "Analytics & Metrics": "Analyses & Métriques",
    "Commercial Challenges": "Défis Commerciaux",
    "Post New Challenge": "Publier un nouveau défi",
    "Track Commercial Challenges": "Suivre les défis commerciaux",
    "Talent Matches": "Correspondances de talents",
    "Venture Portfolio": "Portefeuille d'entreprises",
    "Watchlist": "Liste de veille",
    "No Challenges Found": "Aucun défi trouvé",
    "University of Ghana Virtual Industry Hub": "Hub Industriel Virtuel de l'Université du Ghana",
    "Industry Partner": "Partenaire Industriel",
    "Academic Researcher": "Chercheur Académique",
    "Student Innovator": "Étudiant Innovateur",
    "System Administrator": "Administrateur Système",

    // --- HERO & HOME PAGE ---
    "Bridging Academic Excellence & Industrial Innovation": "Faire le pont entre l'excellence académique et l'innovation industrielle",
    "University of Ghana's premier portal connecting corporate partners, investors, and public institutions directly with groundbreaking research, IP disclosures, and world-class academic talent.": "Le portail principal de l'Université du Ghana reliant les partenaires corporatifs, investisseurs et institutions publiques directement aux recherches novatrices, divulgations PI et talents académiques de classe mondiale.",
    "Explore Innovation Pipeline": "Explorer le pipeline d'innovation",
    "Submit Research Proposal": "Soumettre une proposition de recherche",
    "Explore Research": "Explorer la recherche",
    "Innovation Catalog": "Catalogue d'innovations",
    "Partner Portal": "Portail des partenaires",
    "Active Research Projects": "Projets de recherche actifs",
    "Commercially Validated Technologies": "Technologies validées commercialement",
    "Corporate & Institutional Partners": "Partenaires corporatifs et institutionnels",
    "Patents & Disclosures Filed": "Brevets et divulgations déposés",
    "Featured Breakthroughs": "Percées en vedette",
    "Explore high-impact research disclosures from University of Ghana's top faculties": "Explorez les divulgations de recherche à fort impact des meilleures facultés de l'Université du Ghana",
    "Browse Groundbreaking Research": "Parcourir la recherche novatrice",
    "View Research Specs": "Voir les spécifications de recherche",
    "Commercialization Tracks": "Pistes de commercialisation",
    "Explore how UG-VIH drives technology transfer and economic development": "Découvrez comment le UG-VIH stimule le transfert de technologie et le développement économique",
    "IP Licensing & Transfer": "Licence & transfert de propriété intellectuelle",
    "Protecting and licensing University of Ghana intellectual property to corporate partners.": "Protection et concession de licences de la propriété intellectuelle de l'Université du Ghana aux partenaires corporatifs.",
    "Contract Research": "Recherche sous contrat",
    "Custom R&D solutions and diagnostic testing commissioned by industry leaders.": "Solutions de R&D sur mesure et tests de diagnostic commandés par des leaders de l'industrie.",
    "Student Spin-offs & Incubators": "Spin-offs étudiants & incubateurs",
    "Incubating student-led technology ventures and connecting them with seed capital.": "Incubation d'entreprises technologiques dirigées par des étudiants et mise en relation avec du capital d'amorçage.",
    "Verified Commercial Partners": "Partenaires commerciaux vérifiés",
    "Collaborating with leading global and West African industrial institutions": "Collaboration avec les meilleures institutions industrielles mondiales et d'Afrique de l'Ouest",

    // --- RESEARCH TRACKS & STATUSES ---
    "Agri-Tech & Food Security": "Agri-Tech & Sécurité Alimentaire",
    "Biomedical & Health Sciences": "Sciences Biomédicales & de Santé",
    "Renewable Energy & Climate": "Énergie Renouvelable & Climat",
    "AI, Mining & Data Systems": "IA, Mines & Systèmes de Données",
    "Pharmaceuticals & Diagnostics": "Pharmaceutique & Diagnostic",
    "FinTech & Social Enterprise": "FinTech & Entreprise Sociale",
    "Proof of Concept": "Preuve de Concept",
    "Lab Validation": "Validation en Laboratoire",
    "Field Prototype": "Prototype sur le Terrain",
    "Clinical / Pilot Trial": "Essai Clinique / Pilote",
    "Market Ready": "Prêt pour le Marché",
    "Commercialization": "Commercialisation",

    // --- NAVIGATION & FOOTER ---
    "Research Pipeline": "Pipeline de Recherche",
    "Commercial Catalog": "Catalogue Commercial",
    "Browse research disclosures, patents, and scientific prototypes from University of Ghana scholars.": "Parcourez les divulgations de recherche, brevets et prototypes scientifiques des chercheurs de l'Université du Ghana.",
    "Browse groundbreaking research from University of Ghana scholars.": "Parcourez les recherches novatrices des chercheurs de l'Université du Ghana.",
    "Discover commercially validated technologies and products developed by University of Ghana researchers, ready for licensing and deployment.": "Découvrez des technologies et produits validés commercialement, développés par les chercheurs de l'Université du Ghana, prêts pour les licences et le déploiement.",
    "Filters": "Filtres",
    "Filter Research Pipeline": "Filtrer le pipeline de recherche",
    "Reset": "Réinitialiser",
    "Research Track": "Piste de recherche",
    "Development Stage": "Stade de développement",
    "Sort Projects": "Trier les projets",
    "Apply Filters": "Appliquer les filtres",
    "Loading scientific database...": "Chargement de la base de données scientifique...",
    "Previous": "Précédent",
    "Next": "Suivant",
    "Page": "Page",
    "of": "de",
    "No results found": "Aucun résultat trouvé",
    "Try refining your research keywords or changing filters.": "Essayez de affiner vos mots-clés de recherche ou de modifier les filtres.",
    "Save Search Alert": "Enregistrer l'alerte de recherche",
    "License Validated": "Licence Validée",
    "View Specs": "Voir les spécifications",
    "No products matched criteria.": "Aucun produit ne correspond aux critères.",
    "Try checking other tracks or clearing search terms.": "Essayez de vérifier d'autres pistes ou d'effacer les termes de recherche.",
    "Loading catalog...": "Chargement du catalogue...",
    "Return to Hub": "Retour au Hub",
    "Connect with PI": "Contacter le chercheur principal",
    "Manage Disclosure": "Gérer la divulgation",
    "Withdraw Record": "Retirer le dossier",
    "Public Visitor Mode": "Mode Visiteur Public",
    "Sensitive technical specs, full blueprints, laboratory logs, and direct expression of interest actions on this research project are restricted to verified institutional members.": "Les spécifications techniques sensibles, schémas complets, journaux de laboratoire et actions directes d'expression d'intérêt sur ce projet de recherche sont réservés aux membres institutionnels vérifiés.",
    "Please log in to your account to request authorized disclosure or connect with the PI.": "Veuillez vous connecter à votre compte pour demander une divulgation autorisée ou contacter le chercheur principal.",
    "Executive Summary": "Résumé Exécutif",
    "Visual Disclosure": "Divulgation Visuelle",
    "Key Milestones & Achievements": "Jalons Clés & Réalisations",
    "Access Full Portfolio": "Accéder au portefeuille complet",
    "Bio Loading...": "Chargement de la biographie...",
    "Technical Brief": "Brief Technique",
    "Decrypted Access:": "Accès Déchiffré :",
    "min remaining": "min restantes",
    "Authenticating Session...": "Authentification de la session...",
    "Technical Disclosure": "Divulgation Technique",
    "PDF Document": "Document PDF",
    "Generating Document...": "Génération du document...",
    "Download Document": "Télécharger le document",
    "Disclosure Locked": "Divulgation Verrouillée",
    "Requires Lead Investigator Approval & Privacy Agreement Clearance.": "Nécessite l'approbation du chercheur principal et l'accord de confidentialité.",
    "Request Reveal": "Demander l'accès",
    "Student Application": "Candidature Étudiante",
    "Submission of Interest": "Soumission d'Intérêt",
    "Academic Opportunities Track": "Piste d'Opportunités Académiques",
    "Formal partnership track": "Piste de partenariat formel",
    "Research Assistantship": "Assistanat de recherche",
    "Scholarship Application": "Demande de bourse",
    "Lab Workspace Access": "Accès à l'espace de laboratoire",
    "Partner/Co-Investigate": "Partenaire/Co-investigateur",
    "Venture Funding": "Financement par capital-risque",
    "Resource Access": "Accès aux ressources",
    "Technical Mentorship": "Mentorat technique",
    "Instant portal notification triggered on click.": "Notification instantanée déclenchée au clic.",
    "Ecosystem Impact": "Impact sur l'écosystème",

    // --- COMMON UI & BUTTONS ---
    "Home": "Accueil",
    "Projects": "Projets",
    "Products": "Produits",
    "News": "Actualités",
    "Dashboard": "Tableau de bord",
    "My Dashboard": "Mon Tableau de bord",
    "Login / Register": "Connexion / Inscription",
    "Logout": "Déconnexion",
    "Industry Hub": "Hub Industriel",
    "Search...": "Rechercher...",
    "Filter": "Filtrer",
    "Loading...": "Chargement...",
    "Save": "Enregistrer",
    "Cancel": "Annuler",
    "Delete": "Supprimer",
    "Edit": "Modifier",
    "Submit": "Soumettre",
    "Close": "Fermer",
    "Back": "Retour",
    "View": "Afficher",
    "Details": "Détails",
    "Status": "Statut",
    "Welcome": "Bienvenue",
    "Actions": "Actions",
    "All": "Tous"
  },
  ak: {
    "Home": "Fie",
    "Projects": "Dwuma ahodoɔ",
    "Products": "Nneɛma",
    "News": "Asem foforɔ",
    "Dashboard": "Sua ahenfie",
    "My Dashboard": "Me sua ahenfie",
    "Login / Register": "Kɔ mu / Bɔ din",
    "Logout": "Pue kɔ",
    "Discovery & Industry News": "Afoforɔ ne Nnwuma Nkɔsoɔ Asem",
    "Read Briefing": "Kan akyerɛwkyerɛwɔ",
    "Search news, grants, breakthroughs...": "Hwehwɛ asem foforɔ..."
  },
  sw: {
    "Home": "Nyumbani",
    "Projects": "Miradi",
    "Products": "Bidhaa",
    "News": "Habari",
    "Dashboard": "Asubuhi Ya Kazi",
    "My Dashboard": "Asubuhi Yangu",
    "Login / Register": "Ingia / Jisajili",
    "Logout": "Ondoka",
    "Discovery & Industry News": "Uvumbuzi na Habari za Viwanda",
    "Read Briefing": "Soma Muhtasari",
    "Search news, grants, breakthroughs...": "Tafuta habari, ruzuku..."
  }
};

const DYNAMIC_CACHE_KEY = 'ug_app_translation_cache_v2';

const getLocalCache = (): Record<string, Record<string, string>> => {
  try {
    const raw = localStorage.getItem(DYNAMIC_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setLocalCache = (cache: Record<string, Record<string, string>>) => {
  try {
    localStorage.setItem(DYNAMIC_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

// Synchronous translation lookup
export const translateSync = (text: string | undefined | null, targetLang: string = 'en'): string => {
  if (!text) return '';
  const lang = (targetLang || 'en').split('-')[0].toLowerCase();
  if (lang === 'en') return text;

  const trimmed = text.trim();
  if (!trimmed) return '';

  // 1. Check static dictionary
  if (TRANSLATION_DICTIONARY[lang] && TRANSLATION_DICTIONARY[lang][trimmed]) {
    return TRANSLATION_DICTIONARY[lang][trimmed];
  }

  // 2. Check local dynamic cache
  const cache = getLocalCache();
  if (cache[lang] && cache[lang][trimmed]) {
    return cache[lang][trimmed];
  }

  return text;
};

// Asynchronous translation with API fallback
export const translateAsync = async (text: string | undefined | null, targetLang: string = 'en'): Promise<string> => {
  if (!text) return '';
  const lang = (targetLang || 'en').split('-')[0].toLowerCase();
  if (lang === 'en') return text;

  const trimmed = text.trim();
  if (!trimmed) return '';

  const syncVal = translateSync(trimmed, lang);
  if (syncVal !== trimmed) return syncVal;

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, targetLang: lang })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.translatedText && data.translatedText !== trimmed) {
        const cache = getLocalCache();
        if (!cache[lang]) cache[lang] = {};
        cache[lang][trimmed] = data.translatedText;
        setLocalCache(cache);
        return data.translatedText;
      }
    }
  } catch (err) {
    console.warn('[translationService] Async translation error:', err);
  }

  return trimmed;
};

// Custom React hook for seamless text translation in components
export function useTranslatedText(text: string | undefined | null): string {
  const { i18n } = useTranslation();
  const currentLang = i18n.language ? i18n.language.split('-')[0].toLowerCase() : 'en';
  
  const initialValue = translateSync(text || '', currentLang);
  const [translated, setTranslated] = useState<string>(initialValue);

  useEffect(() => {
    if (!text) {
      setTranslated('');
      return;
    }

    if (currentLang === 'en') {
      setTranslated(text);
      return;
    }

    const immediate = translateSync(text, currentLang);
    setTranslated(immediate);

    if (immediate === text && text.trim().length > 0) {
      let isSubscribed = true;
      translateAsync(text, currentLang).then(res => {
        if (isSubscribed && res) {
          setTranslated(res);
        }
      });
      return () => { isSubscribed = false; };
    }
  }, [text, currentLang]);

  return translated;
}
