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
    autoRefresh: "Auto-refreshes every 10 seconds",
    underInvestigation: "Under Investigation", pendingTrial: "Pending Trial",
    pendingHC: "Pending before High Court", pendingSC: "Pending before Supreme Court",
    crimeNo: "Crime No.", closed: "Closed", active: "Active",
    dashboard: "Dashboard", allCasesHeader: "All Department Cases",
    backendError: "Could not reach the backend. Is Django running?",
    clickToView: "Click to view case detail", of: "of",
    saveCaseSuccess: "New case filed and recorded",
    // Case Detail Tabs
    overview: "Overview", evidence: "Evidence", witnesses: "Witnesses", 
    progress: "Progress", custody: "Custody", recommendations: "Recommendations",
    // Actions & Metadata
    caseCreated: "Case Created", caseViewed: "Case Viewed", stageChanged: "Stage Changed",
    actionUpdated: "Action Updated", caseAssigned: "Case Assigned", caseUpdated: "Case Updated",
    downloadReportBtn: "Download Report", printDetail: "Print Detail", editCase: "Edit Case",
    closeCase: "Close Case", reopenCase: "Re-open Case", deleteCase: "Delete Case",
    verified: "Verified", before: "BEFORE", after: "AFTER", reason: "Reason",
    addedBy: "Added by",
    // Evidence Vault
    evidenceVault: "Digital Evidence Vault", uploadEvidence: "Upload Evidence (Immutable)",
    description: "Description", uploading: "Encrypting & Uploading…", uploadToVault: "Upload to Vault",
    blockchainHint: "Files are hashed (SHA-256) and anchored to Blockchain for tamper-proof verification.",
    blockchainVerified: "Blockchain Verified",
    // Witness Management
    witnessManagement: "Witness Management", addWitness: "Add Witness", 
    registerWitness: "Register Witness Statement (Immutable)", fullName: "Full Name",
    age: "Age", gender: "Gender", male: "Male", female: "Female", other: "Other",
    phone: "Phone Number", relationship: "Relationship to case/accused",
    statement: "Witness Statement", hostile: "Hostile", sec164: "Sec 164 CrPC",
    saveStatement: "Save Immutable Statement", yrs: "yrs", ageNA: "Age NA",
    recordedBy: "Recorded by",
    // Progress
    investigationProgress: "Investigation Progress", addProgress: "Add Progress",
    newProgressEntry: "New Progress Entry", details: "Details", furtherAction: "Further Action",
    remarks: "Remarks", reminderDate: "Reminder Date", saveProgress: "Save Progress Entry",
    markDone: "Mark Done", completed: "Completed", loading: "Loading…", 
    noProgress: "No progress entries yet.",
    // Handover
    handover: "Case Handover", reassignTo: "Reassign To", currentOfficer: "Current Officer",
    selectOfficer: "Select Officer", reasonForHandover: "Reason for Handover",
    confirmHandover: "Confirm Handover", handoverHistory: "Handover History",
    // Recommendations
    analyzingPatterns: "Analyzing patterns for related cases...", noMatchesFound: "No direct matches found",
    smartRecommendations: "Smart Recommendations", viewIntelligence: "View Intelligence",
    accused: "Accused",
    noCases: "No cases registered yet. Chart will populate once cases are filed.",
    timelineHint: "Timeline builds as cases are filed over time.",
    severityDistribution: "SEVERITY DISTRIBUTION",
    severityBreakdown: "SEVERITY BREAKDOWN - IPC REFERENCE",
    caseCrimeNo: "Case / Crime No.", ipcSection: "IPC Section", stage: "Stage", dateFiled: "Date Filed",
    severity: "Severity", cases: "Cases", share: "Share", ipcExamples: "IPC Sections (examples)",
    minor: "Minor", bailable: "Bailable", nonBailable: "Non-Bailable", heinous: "Heinous",
    connecting: "Connecting…", livePoll: "Live · Polls every 5s", synced: "Synced",
    loggedInAs: "Logged in as", supervisor: "Supervisor", caseOfficer: "Case Officer",
    dark: "Dark", light: "Light",
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
    // Legal AI
    aiWelcome: "Hello! I am your Legal Assistant. How can I help you today?",
    aiLead: "Ask legal questions or upload a cast document (PDF/TXT) for an instant AI summary and recommended next steps.",
    aiInputPlaceholder: "Ask about IPC, CrPC or procedure...",
    aiDisclaimer: "AI-generated content for assistance only. Verify with official gazette.",
    aiClear: "Clear",
    sug1: "What documents are needed for HC stage?",
    sug2: "What is the difference between bailable and non-bailable offence?",
    sug3: "What is the procedure for filing a chargesheet?",
    sug4: "What is IPC 302 and its punishment?",
    sug5: "When should a case move from UI to PT stage?",
    sug6: "What is anticipatory bail under CrPC 438?",
    fileSummaryPrompt: "Please summarize this document and suggest next steps.",
    failedResponse: "Failed to get response",
    failedFileAnalyze: "Failed to analyze file",
    unsupportedFile: "Only PDF and TXT files are supported.",
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
    autoRefresh: "ஒவ்வொரு 10 வினாடிக்கும் தானாகவே புதுப்பிக்கப்படும்",
    underInvestigation: "விசாரணையில் உள்ளது", pendingTrial: "விசாரணை நிலுவையில் உள்ளது",
    pendingHC: "உயர் நீதிமன்றத்தில் நிலுவையில் உள்ளது", pendingSC: "உச்ச நீதிமன்றத்தில் நிலுவையில் உள்ளது",
    crimeNo: "குற்ற எண்.", closed: "முடிந்தது", active: "செயலில்",
    dashboard: "டாஷ்போர்டு", allCasesHeader: "அனைத்து துறை வழக்குகள்",
    backendError: "பின்னணி சேவையகத்தை அணுக முடியவில்லை. ஜாங்கோ இயங்குகிறதா?",
    clickToView: "வழக்கு விவரங்களைக் காண கிளிக் செய்யவும்", of: "இல்",
    saveCaseSuccess: "புதிய வழக்கு தாக்கல் செய்யப்பட்டு பதிவு செய்யப்பட்டது",
    // Case Detail Tabs
    overview: "மேலோட்டம்", evidence: "ஆதாரம்", witnesses: "சாட்சிகள்", 
    progress: "முன்னேற்றம்", custody: "காவல் சங்கிலி", recommendations: "பரிந்துரைகள்",
    // Actions & Metadata
    caseCreated: "வழக்கு உருவாக்கப்பட்டது", caseViewed: "வழக்கு பார்க்கப்பட்டது", stageChanged: "நிலை மாற்றப்பட்டது",
    actionUpdated: "செயல் புதுப்பிக்கப்பட்டது", caseAssigned: "வழக்கு ஒதுக்கப்பட்டது", caseUpdated: "வழக்கு புதுப்பிக்கப்பட்டது",
    downloadReportBtn: "அறிக்கையை பதிவிறக்கு", printDetail: "விவரத்தை அச்சிடு", editCase: "வழக்கைத் திருத்து",
    closeCase: "வழக்கை முடி", reopenCase: "வழக்கை மீண்டும் திற", deleteCase: "வழக்கை நீக்கு",
    verified: "சரிபார்க்கப்பட்டது", before: "முன்னர்", after: "பின்னர்", reason: "காரணம்",
    addedBy: "சேர்த்தவர்",
    // Evidence Vault
    evidenceVault: "டிஜிட்டல் ஆதார பெட்டகம்", uploadEvidence: "ஆதாரத்தை பதிவேற்று (மாற்ற முடியாதது)",
    description: "விளக்கம்", uploading: "என்க்ரிப்ட் செய்து பதிவேற்றுகிறது…", uploadToVault: "பெட்டகத்தில் பதிவேற்று",
    blockchainHint: "கோப்புகள் ஹேஷ் செய்யப்பட்டு பிளாக்செயினில் சரிபார்க்கப்படுகின்றன.",
    blockchainVerified: "பிளாக்செயின் சரிபார்க்கப்பட்டது",
    // Witness Management
    witnessManagement: "சாட்சி மேலாண்மை", addWitness: "சாட்சியைச் சேர்", 
    registerWitness: "சாட்சியத்தை பதிவு செய் (மாற்ற முடியாதது)", fullName: "முழு பெயர்",
    age: "வயது", gender: "பாலினம்", male: "ஆண்", female: "பெண்", other: "மற்றவை",
    phone: "தொலைபேசி எண்", relationship: "வழக்கு/குற்றம் சாட்டப்பட்டவருடனான உறவு",
    statement: "சாட்சியம்", hostile: "விரோதமானவர்", sec164: "பிரிவு 164 CrPC",
    saveStatement: "மாற்ற முடியாத சாட்சியத்தை சேமி", yrs: "ஆண்டுகள்", ageNA: "வயது இல்லை",
    recordedBy: "பதிவு செய்தவர்",
    // Progress
    investigationProgress: "விசாரணை முன்னேற்றம்", addProgress: "முன்னேற்றத்தைச் சேர்",
    newProgressEntry: "புதிய முன்னேற்ற பதிவு", details: "விவரங்கள்", furtherAction: "மேலதிக நடவடிக்கை",
    remarks: "குறிப்புகள்", reminderDate: "நினைவூட்டல் தேதி", saveProgress: "முன்னேற்றப் பதிவை சேமி",
    markDone: "முடிந்தது என குறி", completed: "முடிந்தது", loading: "ஏற்றுகிறது…", 
    noProgress: "முன்னேற்ற பதிவுகள் எதுவும் இல்லை.",
    // Handover
    handover: "வழக்கு ஒப்படைப்பு", reassignTo: "மறுஒதுக்கீடு", currentOfficer: "தற்போதைய அதிகாரி",
    selectOfficer: "அதிகாரியைத் தேர்ந்தெடு", reasonForHandover: "ஒப்படைப்புக்கான காரணம்",
    confirmHandover: "ஒப்படைப்பை உறுதிப்படுத்து", handoverHistory: "ஒப்படைப்பு வரலாறு",
    // Recommendations
    analyzingPatterns: "தொடர்புடைய வழக்குகளுக்கான வடிவங்களை ஆய்வு செய்கிறது...", noMatchesFound: "நேரடி பொருத்தங்கள் எதுவும் இல்லை",
    smartRecommendations: "புத்திசாலித்தனமான பரிந்துரைகள்", viewIntelligence: "நுண்ணறிவை காண்க",
    accused: "குற்றம் சாட்டப்பட்டவர்",
    noCases: "வழக்குகள் இன்னும் பதிவு செய்யப்படவில்லை. பதிவு செய்தபின் விளக்கப்படம் தோன்றும்.",
    timelineHint: "வழக்குகள் பதிவு செய்யப்படுவதால் காலவரிசை உருவாகிறது.",
    severityDistribution: "தீவிரம் விநியோகம்",
    severityBreakdown: "தீவிரம் முறிவு - IPC குறிப்பு",
    caseCrimeNo: "வழக்கு / குற்ற எண்.", ipcSection: "IPC பிரிவு", stage: "நிலை", dateFiled: "தாக்கல் செய்யப்பட்ட தேதி",
    severity: "தீவிரம்", cases: "வழக்குகள்", share: "பங்கு", ipcExamples: "IPC பிரிவுகள் (உதாரணங்கள்)",
    minor: "சிறிய", bailable: "பிணையில் வரக்கூடியது", nonBailable: "பிணையில் வரமுடியாதது", heinous: "கொடிய",
    connecting: "இணைக்கிறது…", livePoll: "நேரலை · 5 வினாடிக்கு ஒருமுறை", synced: "ஒத்திசைக்கப்பட்டது",
    loggedInAs: "உள்நுழைந்துள்ளவர்", supervisor: "மேற்பார்வையாளர்", caseOfficer: "வழக்கு அதிகாரி",
    dark: "இருள்", light: "ஒளி",
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
    // Legal AI
    aiWelcome: "வணக்கம்! நான் உங்கள் சட்ட உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    aiLead: "சட்டக் கேள்விகளைக் கேளுங்கள் அல்லது ஒரு ஆவணத்தைப் (PDF/TXT) பதிவேற்றவும்.",
    aiInputPlaceholder: "IPC, CrPC அல்லது நடைமுறை பற்றி கேளுங்கள்...",
    aiDisclaimer: "AI-ஆல் உருவாக்கப்பட்ட உள்ளடக்கம் உதவிக்கு மட்டுமே. அதிகாரப்பூர்வ அரசிதழை சரிபார்க்கவும்.",
    aiClear: "அழி",
    sug1: "HC நிலைக்கு என்ன ஆவணங்கள் தேவை?",
    sug2: "பிணைக்கப்படக்கூடிய மற்றும் பிணைக்கப்பட முடியாத குற்றங்களுக்கு என்ன வித்தியாசம்?",
    sug3: "குற்றப்பத்திரிகை தாக்கல் செய்வதற்கான நடைமுறை என்ன?",
    sug4: "IPC 302 மற்றும் அதன் தண்டனை என்ன?",
    sug5: "ஒரு வழக்கு எப்போது UI இலிருந்து PT நிலைக்கு நகர வேண்டும்?",
    sug6: "CrPC 438 இன் கீழ் முன்ஜாமீன் என்றால் என்ன?",
    fileSummaryPrompt: "தயவுசெய்து இந்த ஆவணத்தைச் சுருக்கி அடுத்த கட்டங்களை பரிந்துரைக்கவும்.",
    failedResponse: "பதில் பெறுவதில் தோல்வி",
    failedFileAnalyze: "கோப்பை ஆய்வு செய்வதில் தோல்வி",
    unsupportedFile: "PDF மற்றும் TXT கோப்புகள் மட்டுமே ஆதரிக்கப்படுகின்றன.",
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
    autoRefresh: "हर 10 सेकंड में ऑटो-रिफ्रेश",
    underInvestigation: "जांच जारी है", pendingTrial: "परीक्षण लंबित",
    pendingHC: "हाई कोर्ट में लंबित", pendingSC: "सुप्रीम कोर्ट में लंबित",
    crimeNo: "अपराध संख्या", closed: "बंद", active: "सक्रिय",
    dashboard: "डैशबोर्ड", allCasesHeader: "सभी विभाग के मामले",
    backendError: "बैकएंड तक नहीं पहुंचा जा सका। क्या Django चल रहा है?",
    clickToView: "मामले का विवरण देखने के लिए क्लिक करें", of: "में से",
    saveCaseSuccess: "नया मामला दर्ज किया गया",
    // Case Detail Tabs
    overview: "अवलोकन", evidence: "साक्ष्य", witnesses: "गवाह", 
    progress: "प्रगति", custody: "हिरासत", recommendations: "सिफारिशें",
    // Actions & Metadata
    caseCreated: "केस बनाया गया", caseViewed: "केस देखा गया", stageChanged: "चरण बदला गया",
    actionUpdated: "कार्रवाई अपडेट की गई", caseAssigned: "केस सौंपा गया", caseUpdated: "केस अपडेट किया गया",
    downloadReportBtn: "रिपोर्ट डाउनलोड करें", printDetail: "विवरण प्रिंट करें", editCase: "केस संपादित करें",
    closeCase: "केस बंद करें", reopenCase: "केस फिर से खोलें", deleteCase: "केस हटाएं",
    verified: "सत्यापित", before: "पहले", after: "बाद में", reason: "कारण",
    addedBy: "द्वारा जोड़ा गया",
    // Evidence Vault
    evidenceVault: "डिजिटल साक्ष्य तिजोरी", uploadEvidence: "साक्ष्य अपलोड करें (अपरिवर्तनीय)",
    description: "विवरण", uploading: "एन्क्रिप्ट और अपलोड कर रहा है…", uploadToVault: "तिजोरी में अपलोड करें",
    blockchainHint: "फाइलों को हैश (SHA-256) किया जाता है और सत्यापन के लिए ब्लॉकचेन पर रखा जाता है।",
    blockchainVerified: "ब्लॉकचेन सत्यापित",
    // Witness Management
    witnessManagement: "गवाह प्रबंधन", addWitness: "गवाह जोड़ें", 
    registerWitness: "गवाह का बयान दर्ज करें (अपरिवर्तनीय)", fullName: "पूरा नाम",
    age: "आयु", gender: "लिंग", male: "पुरुष", female: "महिला", other: "अन्य",
    phone: "फोन नंबर", relationship: "केस/आरोपी से संबंध",
    statement: "गवाह का बयान", hostile: "पक्षद्रोही", sec164: "धारा 164 CrPC",
    saveStatement: "अपरिवर्तनीय बयान सहेजें", yrs: "वर्ष", ageNA: "आयु उपलब्ध नहीं",
    recordedBy: "द्वारा दर्ज",
    // Progress
    investigationProgress: "जांच की प्रगति", addProgress: "प्रगति जोड़ें",
    newProgressEntry: "नई प्रगति प्रविष्टि", details: "विवरण", furtherAction: "आगे की कार्रवाई",
    remarks: "टिप्पणी", reminderDate: "रिमाइंडर तिथि", saveProgress: "प्रगति प्रविष्टि सहेजें",
    markDone: "पूर्ण चिह्नित करें", completed: "पूरा हुआ", loading: "लोड हो रहा है…", 
    noProgress: "अभी तक कोई प्रगति नहीं।",
    // Handover
    handover: "केस हैंडओवर", reassignTo: "पुनर्निर्दिष्ट करें", currentOfficer: "वर्तमान अधिकारी",
    selectOfficer: "अधिकारी चुनें", reasonForHandover: "हैंडओवर का कारण",
    confirmHandover: "हैंडओवर की पुष्टि करें", handoverHistory: "हैंडओवर इतिहास",
    // Recommendations
    analyzingPatterns: "संबंधित केसों के लिए पैटर्न का विश्लेषण कर रहा है...", noMatchesFound: "कोई सीधा मिलान नहीं मिला",
    smartRecommendations: "स्मार्ट सिफारिशें", viewIntelligence: "इंटेलिजेंस देखें",
    accused: "आरोपी",
    noCases: "अभी तक कोई केस दर्ज नहीं हुआ है। केस दर्ज होने पर चार्ट भर जाएगा।",
    timelineHint: "समय के साथ केस दर्ज होने पर टाइमलाइन बनती है।",
    severityDistribution: "गंभीरता वितरण",
    severityBreakdown: "गंभीरता विवरण - IPC संदर्भ",
    caseCrimeNo: "केस / अपराध संख्या", ipcSection: "IPC धारा", stage: "चरण", dateFiled: "दर्ज तिथि",
    severity: "गंभीरता", cases: "केस", share: "हिस्सेदारी", ipcExamples: "IPC धाराएं (उदाहरण)",
    minor: "मामूली", bailable: "जमानती", nonBailable: "गैर-जमानती", heinous: "जघन्य",
    connecting: "जुड़ रहा है…", livePoll: "लाइव · हर 5 सेकंड में", synced: "सिंक किया गया",
    loggedInAs: "के रूप में लॉग इन", supervisor: "पर्यवेक्षक", caseOfficer: "केस अधिकारी",
    dark: "डार्क", light: "लाइट",
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
    // Legal AI
    aiWelcome: "नमस्ते! मैं आपका कानूनी सहायक हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?",
    aiLead: "कानूनी प्रश्न पूछें या त्वरित सारांश के लिए दस्तावेज़ (PDF/TXT) अपलोड करें।",
    aiInputPlaceholder: "IPC, CrPC या प्रक्रिया के बारे में पूछें...",
    aiDisclaimer: "AI-जनित सामग्री केवल सहायता के लिए। आधिकारिक राजपत्र से सत्यापित करें।",
    aiClear: "साफ़ करें",
    sug1: "HC चरण के लिए कौन से दस्तावेज़ आवश्यक हैं?",
    sug2: "जमानती और गैर-जमानती अपराध में क्या अंतर है?",
    sug3: "चार्जशीट दाखिल करने की प्रक्रिया क्या है?",
    sug4: "IPC 302 और उसकी सजा क्या है?",
    sug5: "एक मामला UI से PT चरण में कब जाना चाहिए?",
    sug6: "CrPC 438 के तहत अग्रिम जमानत क्या है?",
    fileSummaryPrompt: "कृपया इस दस्तावेज़ का सारांश प्रस्तुत करें और अगले चरणों का सुझाव दें।",
    failedResponse: "प्रतिक्रिया प्राप्त करने में विफल",
    failedFileAnalyze: "फ़ाइल का विश्लेषण करने में विफल",
    unsupportedFile: "केवल PDF और TXT फ़ाइलें समर्थित हैं।",
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
