import { createContext, useContext, useState, useCallback } from "react";

const translations = {
  en: {
    // Common
    back: "← Back", logout: "Logout", save: "Save", cancel: "Cancel", loading: "Loading…",
    dark: "Dark", light: "Light", search: "Search…",
    // Dashboard
    commandCenter: "COATS Command Center", totalCases: "Total Cases", activeCases: "Active Cases",
    closedCases: "Closed Cases", casesThisMonth: "Cases This Month", allCases: "All Cases",
    legalAI: "Legal AI", crimeMap: "Crime Map", linkAnalysis: "Link Analysis",
    severityChart: "Cases by Severity", monthlyTrend: "Monthly Filing Trend",
    recentCases: "Recently Filed Cases", viewAll: "View all →",
    // Case Detail
    caseDetail: "Case Detail", caseInfo: "Case Information", partiesGist: "Parties & Gist",
    caseStatus: "Case Status & Action", progress: "Progress", custody: "Custody",
    handover: "Handover", evidence: "Evidence", witnesses: "Witnesses",
    relatedCases: "Related Cases", updateCase: "Update Case",
    // Evidence
    evidenceVault: "Digital Evidence Vault", uploadEvidence: "Upload Evidence",
    dragDrop: "Drop files here or click to browse", fileHash: "SHA-256 Hash",
    verified: "Verified", uploadedBy: "Uploaded by",
    // Witnesses
    witnessManagement: "Witness Management", addWitness: "Add Witness",
    witnessName: "Name", witnessAge: "Age", witnessGender: "Gender",
    witnessAddress: "Address", witnessPhone: "Phone", witnessRelation: "Relationship",
    witnessStatement: "Statement", hostile: "Hostile", cooperative: "Cooperative",
    section164: "Sec 164 CrPC", protectionStatus: "Protection Status",
    // Map
    crimeHotspot: "Crime Hotspot Map", casesPlotted: "cases plotted across Tamil Nadu",
    allBranches: "All Branches", allStages: "All Stages",
    // Link Analysis
    accusedAnalysis: "Accused Link Analysis", accused: "Accused", links: "Links",
    multiCase: "Multi-Case",
    // Fields
    branch: "Branch", psLimit: "PS Limit", crimeNo: "Crime No.",
    ipcSection: "IPC Section", dateOccurrence: "Date of Occurrence",
    dateRegistration: "Date of Registration", complainant: "Complainant",
    accusedDetails: "Accused Details", gistOfCase: "Gist of Case",
    currentStage: "Current Stage", actionToBeTaken: "Action to be Taken",
    reasonForUpdate: "Reason for Update",
  },
  ta: {
    // Common
    back: "← பின்செல்", logout: "வெளியேறு", save: "சேமி", cancel: "ரத்துசெய்", loading: "ஏற்றுகிறது…",
    dark: "இருள்", light: "ஒளி", search: "தேடு…",
    // Dashboard
    commandCenter: "COATS கட்டளை மையம்", totalCases: "மொத்த வழக்குகள்", activeCases: "செயலில் உள்ள வழக்குகள்",
    closedCases: "முடிந்த வழக்குகள்", casesThisMonth: "இந்த மாதம்", allCases: "அனைத்து வழக்குகள்",
    legalAI: "சட்ட AI", crimeMap: "குற்ற வரைபடம்", linkAnalysis: "இணைப்பு பகுப்பாய்வு",
    severityChart: "தீவிரம் வாரியாக", monthlyTrend: "மாதாந்திர போக்கு",
    recentCases: "சமீபத்திய வழக்குகள்", viewAll: "அனைத்தையும் காண →",
    // Case Detail
    caseDetail: "வழக்கு விவரம்", caseInfo: "வழக்கு தகவல்", partiesGist: "தரப்பினர் & சுருக்கம்",
    caseStatus: "வழக்கு நிலை", progress: "முன்னேற்றம்", custody: "காவல் சங்கிலி",
    handover: "கைமாற்று", evidence: "ஆதாரங்கள்", witnesses: "சாட்சிகள்",
    relatedCases: "தொடர்புடைய வழக்குகள்", updateCase: "வழக்கை புதுப்பி",
    // Evidence
    evidenceVault: "டிஜிட்டல் ஆதார பெட்டகம்", uploadEvidence: "ஆதாரம் பதிவேற்று",
    dragDrop: "கோப்புகளை இங்கே இழுக்கவும்", fileHash: "SHA-256 ஹாஷ்",
    verified: "சரிபார்க்கப்பட்டது", uploadedBy: "பதிவேற்றியவர்",
    // Witnesses
    witnessManagement: "சாட்சி மேலாண்மை", addWitness: "சாட்சி சேர்",
    witnessName: "பெயர்", witnessAge: "வயது", witnessGender: "பாலினம்",
    witnessAddress: "முகவரி", witnessPhone: "தொலைபேசி", witnessRelation: "உறவு",
    witnessStatement: "வாக்குமூலம்", hostile: "விரோதமான", cooperative: "ஒத்துழைப்பான",
    section164: "பிரிவு 164 CrPC", protectionStatus: "பாதுகாப்பு நிலை",
    // Map
    crimeHotspot: "குற்ற புள்ளி வரைபடம்", casesPlotted: "வழக்குகள் தமிழ்நாடு முழுவதும்",
    allBranches: "அனைத்து கிளைகள்", allStages: "அனைத்து நிலைகள்",
    // Link Analysis
    accusedAnalysis: "குற்றவாளி இணைப்பு பகுப்பாய்வு", accused: "குற்றவாளிகள்", links: "இணைப்புகள்",
    multiCase: "பல வழக்குகள்",
    // Fields
    branch: "கிளை", psLimit: "காவல் நிலையம்", crimeNo: "குற்ற எண்",
    ipcSection: "IPC பிரிவு", dateOccurrence: "நிகழ்ந்த தேதி",
    dateRegistration: "பதிவு தேதி", complainant: "புகார்தாரர்",
    accusedDetails: "குற்றவாளி விவரங்கள்", gistOfCase: "வழக்கின் சுருக்கம்",
    currentStage: "தற்போதைய நிலை", actionToBeTaken: "எடுக்க வேண்டிய நடவடிக்கை",
    reasonForUpdate: "புதுப்பிப்புக்கான காரணம்",
  },
  hi: {
    // Common
    back: "← वापस", logout: "लॉगआउट", save: "सहेजें", cancel: "रद्द करें", loading: "लोड हो रहा है…",
    dark: "डार्क", light: "लाइट", search: "खोजें…",
    // Dashboard
    commandCenter: "COATS कमांड सेंटर", totalCases: "कुल केस", activeCases: "सक्रिय केस",
    closedCases: "बंद केस", casesThisMonth: "इस माह के केस", allCases: "सभी केस",
    legalAI: "कानूनी AI", crimeMap: "अपराध मानचित्र", linkAnalysis: "लिंक विश्लेषण",
    severityChart: "गंभीरता के अनुसार", monthlyTrend: "मासिक प्रवृत्ति",
    recentCases: "हालिया केस", viewAll: "सभी देखें →",
    // Case Detail
    caseDetail: "केस विवरण", caseInfo: "केस जानकारी", partiesGist: "पक्ष और सारांश",
    caseStatus: "केस स्थिति", progress: "प्रगति", custody: "हिरासत श्रृंखला",
    handover: "हस्तांतरण", evidence: "सबूत", witnesses: "गवाह",
    relatedCases: "संबंधित केस", updateCase: "केस अपडेट करें",
    // Evidence
    evidenceVault: "डिजिटल सबूत तिजोरी", uploadEvidence: "सबूत अपलोड करें",
    dragDrop: "फ़ाइलें यहाँ खींचें", fileHash: "SHA-256 हैश",
    verified: "सत्यापित", uploadedBy: "अपलोड किया",
    // Witnesses
    witnessManagement: "गवाह प्रबंधन", addWitness: "गवाह जोड़ें",
    witnessName: "नाम", witnessAge: "आयु", witnessGender: "लिंग",
    witnessAddress: "पता", witnessPhone: "फ़ोन", witnessRelation: "संबंध",
    witnessStatement: "बयान", hostile: "शत्रुतापूर्ण", cooperative: "सहयोगी",
    section164: "धारा 164 CrPC", protectionStatus: "सुरक्षा स्थिति",
    // Map
    crimeHotspot: "अपराध हॉटस्पॉट मानचित्र", casesPlotted: "केस तमिलनाडु में",
    allBranches: "सभी शाखाएँ", allStages: "सभी चरण",
    // Link Analysis
    accusedAnalysis: "आरोपी लिंक विश्लेषण", accused: "आरोपी", links: "लिंक",
    multiCase: "बहु-केस",
    // Fields
    branch: "शाखा", psLimit: "थाना", crimeNo: "अपराध संख्या",
    ipcSection: "IPC धारा", dateOccurrence: "घटना तिथि",
    dateRegistration: "पंजीकरण तिथि", complainant: "शिकायतकर्ता",
    accusedDetails: "आरोपी विवरण", gistOfCase: "केस का सारांश",
    currentStage: "वर्तमान चरण", actionToBeTaken: "अगली कार्रवाई",
    reasonForUpdate: "अपडेट का कारण",
  },
};

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ta", label: "தமிழ்", flag: "🇮🇳" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
];

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("coats-lang") || "en"; } catch { return "en"; }
  });

  const switchLang = useCallback((code) => {
    setLang(code);
    try { localStorage.setItem("coats-lang", code); } catch {}
  }, []);

  const tr = useCallback((key) => {
    return translations[lang]?.[key] || translations.en[key] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, switchLang, tr, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function LanguageSwitcher({ t: theme }) {
  const { lang, switchLang, languages } = useLanguage();
  return (
    <div style={{ display: "flex", gap: 2, background: theme.bgCard || "#141927", border: `1px solid ${theme.border || "#222d42"}`, borderRadius: 8, padding: 2 }}>
      {languages.map(l => (
        <button
          key={l.code}
          onClick={() => switchLang(l.code)}
          style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", fontWeight: 600,
            cursor: "pointer", borderRadius: 6, padding: "4px 8px", border: "none",
            background: lang === l.code ? (theme.accent || "#4f8ef7") : "transparent",
            color: lang === l.code ? "#fff" : (theme.textMuted || "#637fae"),
            transition: "all .2s",
          }}
        >
          {l.flag} {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
