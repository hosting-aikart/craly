export type Language = 'en' | 'hi' | 'mr';

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
];

export interface Translations {
  hero: {
    badgeVerified: string;
    badgeTrusted: string;
    headlinePrefix: string;
    headlineAccent: string;
    headlineSuffix: string;
    subtext: string;
    ctaFind: string;
    ctaJoin: string;
  };
  trust: {
    eyebrow: string;
    heading: string;
  };
  roleSelect: {
    eyebrow: string;
    heading: string;
    contractorTitle: string;
    contractorDesc: string;
    contractorAction: string;
    businessTitle: string;
    businessDesc: string;
    businessAction: string;
  };
  carousel: {
    business: string;
    license: string;
    workforce: string;
    projects: string;
    ratings: string;
    documents: string;
  };
  whyCraly: {
    eyebrow: string;
    heading: string;
    badges: [string, string, string, string];
  };
  howItWorks: {
    eyebrow: string;
    heading: string;
    steps: { title: string; text: string }[];
  };
  builtFor: {
    eyebrow: string;
    heading: string;
    slides: { title: string; text: string }[];
  };
  contact: {
    eyebrow: string;
    heading: string;
    subtext: string;
    modalTitle: string;
    modalSubtitle: string;
    fieldName: string;
    fieldEmail: string;
    fieldPhone: string;
    fieldCompany: string;
    fieldMessage: string;
    placeholderName: string;
    placeholderCompany: string;
    placeholderMessage: string;
    send: string;
    sending: string;
    sendAnother: string;
    close: string;
    successTitle: string;
    successBody: string;
    genericError: string;
  };
  faq: {
    heading: string;
    items: {
      q: string;
      a?: string;
      intro?: string;
      list?: string[];
    }[];
  };
  footer: {
    tagline: string;
    subtext: string;
    navHeading: string;
    navTrust: string;
    navWhy: string;
    navHow: string;
    navFaq: string;
    navContact: string;
    address: string;
    phone: string;
    email: string;
    copyright: string;
  };
  nav: {
    home: string;
    contractors: string;
    whyCraly: string;
    howItWorks: string;
    faq: string;
    dashboard: string;
    login: string;
    logout: string;
    getStarted: string;
  };
  auth: {
    networkEyebrow: string;
    loginHeading: string;
    signupHeading: string;
    contractorRoleTitle: string;
    contractorRoleDesc: string;
    businessRoleTitle: string;
    businessRoleDesc: string;
    securityBadge: string;
    welcomeBackEyebrow: string;
    logInTitle: string;
    createAccountEyebrow: string;
    joinTitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    companyNameLabel: string;
    companyNamePlaceholder: string;
    forgotPassword: string;
    loggingIn: string;
    logInBtn: string;
    creatingAccount: string;
    createAccountBtn: string;
    newToCraly: string;
    alreadyHaveAccount: string;
    joinAsContractor: string;
    joinAsBusiness: string;
    iamContractor: string;
    iamBusiness: string;
  };
  contractors: {
    pageTitle: string;
    pageSubtitle: string;
    searchPlaceholder: string;
    filterTitle: string;
    filterState: string;
    allStates: string;
    filterCategory: string;
    allCategories: string;
    minExperience: string;
    minWorkforce: string;
    anyExperience: string;
    anyWorkforce: string;
    applyFilters: string;
    clearFilters: string;
    foundCount: string;
    noResultsTitle: string;
    noResultsDesc: string;
    viewProfile: string;
    sendEnquiry: string;
    verifiedBadge: string;
    workforceLabel: string;
    experienceLabel: string;
    prevPage: string;
    nextPage: string;
    pageOf: string;
  };
  contractorDetail: {
    backToDirectory: string;
    tabOverview: string;
    tabWorkforce: string;
    tabLicenses: string;
    tabProjects: string;
    tabReviews: string;
    contactBtn: string;
    companyInfoTitle: string;
    gstinLabel: string;
    panLabel: string;
    addressLabel: string;
    statesLabel: string;
    workforceTitle: string;
    totalWorkers: string;
    skilledWorkers: string;
    unskilledWorkers: string;
    licensesTitle: string;
    licenseType: string;
    licenseNumber: string;
    validTill: string;
    projectsTitle: string;
    reviewsTitle: string;
    contactModalTitle: string;
    contactModalSub: string;
    subjectLabel: string;
    messageLabel: string;
    sendBtn: string;
    sendingBtn: string;
    enquirySentSuccess: string;
  };
  businessDashboard: {
    welcome: string;
    subtitle: string;
    statEnquiries: string;
    statSaved: string;
    statHired: string;
    searchHeroTitle: string;
    searchHeroSub: string;
    recentEnquiriesTitle: string;
    viewAllEnquiries: string;
    contractorCol: string;
    dateCol: string;
    statusCol: string;
    actionCol: string;
    noEnquiries: string;
  };
  contractorDashboard: {
    welcome: string;
    subtitle: string;
    profileStatusTitle: string;
    verificationStatus: string;
    verified: string;
    pendingVerification: string;
    incomplete: string;
    completenessLabel: string;
    completeOnboardingBtn: string;
    statEnquiriesReceived: string;
    statProfileViews: string;
    recentEnquiriesTitle: string;
    viewDetails: string;
  };
  enquiries: {
    pageTitle: string;
    pageSubtitle: string;
    allTab: string;
    pendingTab: string;
    respondedTab: string;
    closedTab: string;
    statusPending: string;
    statusResponded: string;
    statusClosed: string;
    subject: string;
    date: string;
    messageHistory: string;
    typeReplyPlaceholder: string;
    sendReplyBtn: string;
    sendingReply: string;
    updateStatusBtn: string;
    emptyEnquiries: string;
  };
  onboarding: {
    pageTitle: string;
    pageSubtitle: string;
    stepCompany: string;
    stepDetails: string;
    stepDocs: string;
    companyName: string;
    stateOfOperation: string;
    gstin: string;
    pan: string;
    workforceCapacity: string;
    categories: string;
    saveAndContinue: string;
    submitting: string;
    completeSetup: string;
  };
  notifications: {
    pageTitle: string;
    markAllRead: string;
    emptyState: string;
    newEnquiry: string;
  };
  common: {
    loading: string;
    error: string;
    tryAgain: string;
    back: string;
    save: string;
    cancel: string;
    close: string;
  };
}

const en: Translations = {
  hero: {
    badgeVerified: 'Verified Contractors',
    badgeTrusted: 'Trusted People',
    headlinePrefix: 'Smarter Way to ',
    headlineAccent: 'Discover',
    headlineSuffix: ' Labour Contractors',
    subtext: 'Verified contractor profiles for modern businesses. Build trust before the first phone call.',
    ctaFind: 'Find a Contractor',
    ctaJoin: 'Join as Contractor',
  },
  trust: {
    eyebrow: 'TRUSTED INFORMATION',
    heading: 'Everything You Need to Evaluate a Contractor in One Place',
  },
  roleSelect: {
    eyebrow: 'GET STARTED',
    heading: 'Which side are you on?',
    contractorTitle: "I'm a Contractor",
    contractorDesc: 'Build a verified profile and get discovered by businesses looking to hire.',
    contractorAction: 'Create contractor profile',
    businessTitle: "I'm a Business",
    businessDesc: 'Search and hire verified, trustworthy contractors with confidence.',
    businessAction: 'Browse contractors',
  },
  carousel: {
    business: 'Business Verification',
    license: 'Licenses & Compliance',
    workforce: 'Workforce Details',
    projects: 'Project History',
    ratings: 'Ratings & Reviews',
    documents: 'Verified Documents',
  },
  whyCraly: {
    eyebrow: 'WHY CRALY',
    heading: 'Make Better Contractor Decisions',
    badges: [
      'Reduce hiring risk',
      'Improve contractor transparency',
      'Save time during evaluation',
      'Make confident decisions',
    ],
  },
  howItWorks: {
    eyebrow: 'HOW IT WORKS',
    heading: 'A Simple Verification Process',
    steps: [
      {
        title: 'Contractor Creates Profile',
        text: 'Contractors register their business and submit company information.',
      },
      {
        title: 'Information Gets Verified',
        text: 'Business details, documents, and compliance information are reviewed and verified.',
      },
      {
        title: 'Build a Trusted Profile',
        text: 'Verified contractor profiles showcase business information, experience, and work history.',
      },
      {
        title: 'Hire With Confidence',
        text: 'Businesses review verified profiles and reach out to the right contractor with confidence.',
      },
    ],
  },
  builtFor: {
    eyebrow: 'BUILT FOR',
    heading: "Designed for India's Industrial Ecosystem",
    slides: [
      {
        title: 'Manufacturers',
        text: 'Find reliable labour contractors for production and plant operations.',
      },
      {
        title: 'EPC & Engineering Companies',
        text: 'Evaluate contractors before project execution.',
      },
      {
        title: 'Infrastructure & Construction',
        text: 'Review contractor profiles before awarding work.',
      },
      {
        title: 'Labour Contractors',
        text: 'Build trust, showcase experience, and grow your business.',
      },
    ],
  },
  contact: {
    eyebrow: 'GET IN TOUCH',
    heading: "Have a Question? Let's Talk.",
    subtext:
      "Whether you're a business looking to hire or a contractor ready to get verified — send us a message and our team will get back to you.",
    modalTitle: 'Contact Us',
    modalSubtitle: 'Have a question or want to get in touch? Fill out the form below.',
    fieldName: 'Full Name*',
    fieldEmail: 'Email*',
    fieldPhone: 'Phone',
    fieldCompany: 'Company',
    fieldMessage: 'Message*',
    placeholderName: 'Your name',
    placeholderCompany: 'Company name',
    placeholderMessage: 'How can we help?',
    send: 'Send Message',
    sending: 'Sending…',
    sendAnother: 'Send another message',
    close: 'Close',
    successTitle: 'Thanks for reaching out!',
    successBody: "We've received your message and will get back to you shortly.",
    genericError: 'Something went wrong. Please try again later.',
  },
  faq: {
    heading: 'Frequently Asked Questions',
    items: [
      {
        q: 'What is Craly?',
        a: 'Craly is a contractor verification platform that helps businesses evaluate labour contractors through verified business information, work history, and compliance details before hiring.',
      },
      {
        q: 'Who can use Craly?',
        intro: 'Craly is built for:',
        list: [
          'Manufacturers',
          'EPC & Engineering Companies',
          'Construction Firms',
          'Infrastructure Companies',
          'Warehousing & Logistics Businesses',
          'Labour Contractors',
        ],
      },
      {
        q: 'Why should businesses use Craly?',
        a: 'Hiring the right contractor is critical to project success. Craly helps businesses make informed hiring decisions by providing trusted contractor information in one place.',
      },
      {
        q: 'How do contractors get verified?',
        a: 'Contractors submit their business information and supporting documents. Our verification process helps build a trusted profile that businesses can review.',
      },
    ],
  },
  footer: {
    tagline: 'Building trust before the first phone call.',
    subtext: 'Verified contractor profiles for modern businesses.',
    navHeading: 'Navigation',
    navTrust: 'Trust Section',
    navWhy: 'Why Craly',
    navHow: 'How It Works',
    navFaq: 'FAQ',
    navContact: 'Contact Us',
    address: 'Badnera Rd, in front of Tapadia City Centre Mall, Saturna, Amravati, Maharashtra 444607',
    phone: '+91 95032 52288',
    email: 'hello@craly.com',
    copyright: '© 2026 Craly. All rights reserved.',
  },
  nav: {
    home: 'Home',
    contractors: 'Contractors',
    whyCraly: 'Why Craly',
    howItWorks: 'How It Works',
    faq: 'FAQ',
    dashboard: 'Dashboard',
    login: 'Log In',
    logout: 'Log Out',
    getStarted: 'Get Started',
  },
  auth: {
    networkEyebrow: 'ONE VERIFIED NETWORK',
    loginHeading: 'Continue building trust, right where you left off.',
    signupHeading: 'Get discovered — or find who you need.',
    contractorRoleTitle: 'Contractor',
    contractorRoleDesc: 'Build a verified profile & get hired',
    businessRoleTitle: 'Business',
    businessRoleDesc: 'Find and hire with confidence',
    securityBadge: 'Your account and business details stay protected.',
    welcomeBackEyebrow: 'WELCOME BACK',
    logInTitle: 'Log In',
    createAccountEyebrow: 'CREATE ACCOUNT',
    joinTitle: 'Join Craly',
    emailLabel: 'Email',
    emailPlaceholder: 'you@company.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: '••••••••',
    companyNameLabel: 'Company Name',
    companyNamePlaceholder: 'Acme Pvt Ltd',
    forgotPassword: 'Forgot password?',
    loggingIn: 'Logging in…',
    logInBtn: 'Log In',
    creatingAccount: 'Creating account…',
    createAccountBtn: 'Create Account',
    newToCraly: 'New to Craly?',
    alreadyHaveAccount: 'Already have an account?',
    joinAsContractor: 'Join as Contractor',
    joinAsBusiness: 'Join as Business',
    iamContractor: "I'm a Contractor",
    iamBusiness: "I'm a Business",
  },
  contractors: {
    pageTitle: 'Discover Labour Contractors',
    pageSubtitle: 'Search verified contractors across India for manufacturing, construction, and plant operations.',
    searchPlaceholder: 'Search contractors by name, city, or service...',
    filterTitle: 'Filter Contractors',
    filterState: 'State',
    allStates: 'All States',
    filterCategory: 'Category',
    allCategories: 'All Categories',
    minExperience: 'Min Experience (Years)',
    minWorkforce: 'Min Workforce Capacity',
    anyExperience: 'Any Experience',
    anyWorkforce: 'Any Capacity',
    applyFilters: 'Apply Filters',
    clearFilters: 'Clear Filters',
    foundCount: 'contractors found',
    noResultsTitle: 'No contractors found',
    noResultsDesc: 'Try adjusting your search criteria or clearing filters.',
    viewProfile: 'View Profile',
    sendEnquiry: 'Send Enquiry',
    verifiedBadge: 'Verified',
    workforceLabel: 'Workforce',
    experienceLabel: 'Experience',
    prevPage: 'Previous',
    nextPage: 'Next',
    pageOf: 'Page',
  },
  contractorDetail: {
    backToDirectory: '← Back to Contractors',
    tabOverview: 'Overview',
    tabWorkforce: 'Workforce',
    tabLicenses: 'Licenses & Compliance',
    tabProjects: 'Projects & Experience',
    tabReviews: 'Reviews & Ratings',
    contactBtn: 'Contact Contractor',
    companyInfoTitle: 'Company Overview',
    gstinLabel: 'GSTIN',
    panLabel: 'PAN',
    addressLabel: 'Address',
    statesLabel: 'Operating States',
    workforceTitle: 'Workforce Capacity',
    totalWorkers: 'Total Workforce',
    skilledWorkers: 'Skilled Workers',
    unskilledWorkers: 'Unskilled Workers',
    licensesTitle: 'Compliance & Registrations',
    licenseType: 'Document / License',
    licenseNumber: 'License Number',
    validTill: 'Valid Till',
    projectsTitle: 'Past Projects & History',
    reviewsTitle: 'Business Ratings & Feedback',
    contactModalTitle: 'Send Enquiry',
    contactModalSub: 'Reach out directly to discuss project workforce requirements.',
    subjectLabel: 'Subject',
    messageLabel: 'Message & Project Requirements',
    sendBtn: 'Send Message',
    sendingBtn: 'Sending…',
    enquirySentSuccess: 'Enquiry sent successfully!',
  },
  businessDashboard: {
    welcome: 'Welcome back',
    subtitle: 'Manage your contractor enquiries and discover verified teams.',
    statEnquiries: 'Total Enquiries',
    statSaved: 'Saved Profiles',
    statHired: 'Active Contracts',
    searchHeroTitle: 'Need Labour Contractors?',
    searchHeroSub: 'Find verified contractors for your plant, factory, or project execution.',
    recentEnquiriesTitle: 'Recent Enquiries',
    viewAllEnquiries: 'View All Enquiries',
    contractorCol: 'Contractor',
    dateCol: 'Date',
    statusCol: 'Status',
    actionCol: 'Action',
    noEnquiries: 'No enquiries sent yet. Start searching to contact contractors!',
  },
  contractorDashboard: {
    welcome: 'Welcome back',
    subtitle: 'Manage your verified business profile and customer enquiries.',
    profileStatusTitle: 'Profile Status',
    verificationStatus: 'Verification Status',
    verified: 'Verified Profile',
    pendingVerification: 'Verification Pending',
    incomplete: 'Incomplete Profile',
    completenessLabel: 'Profile Completeness',
    completeOnboardingBtn: 'Complete Onboarding Profile',
    statEnquiriesReceived: 'Enquiries Received',
    statProfileViews: 'Profile Views',
    recentEnquiriesTitle: 'Received Enquiries',
    viewDetails: 'View Details',
  },
  enquiries: {
    pageTitle: 'Enquiries',
    pageSubtitle: 'Track messages and communication between businesses and contractors.',
    allTab: 'All Enquiries',
    pendingTab: 'Pending',
    respondedTab: 'Responded',
    closedTab: 'Closed',
    statusPending: 'Pending',
    statusResponded: 'Responded',
    statusClosed: 'Closed',
    subject: 'Subject',
    date: 'Date',
    messageHistory: 'Message History',
    typeReplyPlaceholder: 'Type your message reply here...',
    sendReplyBtn: 'Send Reply',
    sendingReply: 'Sending...',
    updateStatusBtn: 'Update Status',
    emptyEnquiries: 'No enquiries found in this category.',
  },
  onboarding: {
    pageTitle: 'Complete Your Business Profile',
    pageSubtitle: 'Provide official business details to get your verified badge on Craly.',
    stepCompany: 'Business Info',
    stepDetails: 'Workforce & Capacity',
    stepDocs: 'Documents & Verification',
    companyName: 'Company / Business Name',
    stateOfOperation: 'States of Operation',
    gstin: 'GSTIN Registration Number',
    pan: 'PAN Number',
    workforceCapacity: 'Total Workforce Capacity',
    categories: 'Categories & Services',
    saveAndContinue: 'Save & Continue',
    submitting: 'Saving...',
    completeSetup: 'Complete Setup',
  },
  notifications: {
    pageTitle: 'Notifications',
    markAllRead: 'Mark all as read',
    emptyState: 'No notifications at this time.',
    newEnquiry: 'New enquiry received',
  },
  common: {
    loading: 'Loading...',
    error: 'Something went wrong',
    tryAgain: 'Try Again',
    back: 'Back',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
  },
};

const hi: Translations = {
  hero: {
    badgeVerified: 'सत्यापित ठेकेदार',
    badgeTrusted: 'विश्वसनीय लोग',
    headlinePrefix: 'श्रम ठेकेदारों को ',
    headlineAccent: 'खोजने',
    headlineSuffix: ' का स्मार्ट तरीका',
    subtext: 'आधुनिक व्यवसायों के लिए सत्यापित ठेकेदार प्रोफ़ाइल। पहली कॉल से पहले भरोसा बनाएं।',
    ctaFind: 'ठेकेदार खोजें',
    ctaJoin: 'ठेकेदार के रूप में जुड़ें',
  },
  trust: {
    eyebrow: 'विश्वसनीय जानकारी',
    heading: 'ठेकेदार का मूल्यांकन करने के लिए ज़रूरी हर चीज़ एक ही जगह',
  },
  roleSelect: {
    eyebrow: 'शुरू करें',
    heading: 'आप किस तरफ हैं?',
    contractorTitle: 'मैं एक ठेकेदार हूं',
    contractorDesc: 'एक सत्यापित प्रोफ़ाइल बनाएं और नियुक्ति करने वाले व्यवसायों द्वारा खोजे जाएं।',
    contractorAction: 'ठेकेदार प्रोफ़ाइल बनाएं',
    businessTitle: 'मैं एक व्यवसाय हूं',
    businessDesc: 'आत्मविश्वास के साथ सत्यापित, विश्वसनीय ठेकेदारों को खोजें और नियुक्त करें।',
    businessAction: 'ठेकेदार देखें',
  },
  carousel: {
    business: 'व्यवसाय सत्यापन',
    license: 'लाइसेंस और अनुपालन',
    workforce: 'कार्यबल विवरण',
    projects: 'परियोजना इतिहास',
    ratings: 'रेटिंग और समीक्षाएं',
    documents: 'सत्यापित दस्तावेज़',
  },
  whyCraly: {
    eyebrow: 'क्रैली क्यों',
    heading: 'बेहतर ठेकेदार निर्णय लें',
    badges: [
      'भर्ती जोखिम कम करें',
      'ठेकेदार पारदर्शिता बढ़ाएं',
      'मूल्यांकन में समय बचाएं',
      'आत्मविश्वास से निर्णय लें',
    ],
  },
  howItWorks: {
    eyebrow: 'यह कैसे काम करता है',
    heading: 'एक सरल सत्यापन प्रक्रिया',
    steps: [
      {
        title: 'ठेकेदार प्रोफ़ाइल बनाता है',
        text: 'ठेकेदार अपना व्यवसाय पंजीकृत करते हैं और कंपनी की जानकारी जमा करते हैं।',
      },
      {
        title: 'जानकारी सत्यापित की जाती है',
        text: 'व्यावसायिक विवरण, दस्तावेज़ और अनुपालन जानकारी की समीक्षा और सत्यापन किया जाता है।',
      },
      {
        title: 'विश्वसनीय प्रोफ़ाइल बनाएं',
        text: 'सत्यापित ठेकेदार प्रोफ़ाइल व्यवसाय जानकारी, अनुभव और कार्य इतिहास प्रदर्शित करती हैं।',
      },
      {
        title: 'आत्मविश्वास से नियुक्त करें',
        text: 'व्यवसाय सत्यापित प्रोफ़ाइल की समीक्षा करते हैं और आत्मविश्वास के साथ सही ठेकेदार से संपर्क करते हैं।',
      },
    ],
  },
  builtFor: {
    eyebrow: 'इनके लिए बनाया गया',
    heading: 'भारत के औद्योगिक पारिस्थितिकी तंत्र के लिए डिज़ाइन किया गया',
    slides: [
      {
        title: 'निर्माता',
        text: 'उत्पादन और प्लांट संचालन के लिए विश्वसनीय श्रम ठेकेदार खोजें।',
      },
      {
        title: 'ईपीसी और इंजीनियरिंग कंपनियां',
        text: 'परियोजना निष्पादन से पहले ठेकेदारों का मूल्यांकन करें।',
      },
      {
        title: 'बुनियादी ढांचा और निर्माण',
        text: 'काम देने से पहले ठेकेदार प्रोफ़ाइल की समीक्षा करें।',
      },
      {
        title: 'श्रम ठेकेदार',
        text: 'विश्वास बनाएं, अनुभव दिखाएं और अपना व्यवसाय बढ़ाएं।',
      },
    ],
  },
  contact: {
    eyebrow: 'संपर्क करें',
    heading: 'कोई सवाल है? बात करते हैं।',
    subtext:
      'चाहे आप नियुक्ति करने वाला व्यवसाय हों या सत्यापन के लिए तैयार ठेकेदार — हमें संदेश भेजें और हमारी टीम आपसे संपर्क करेगी।',
    modalTitle: 'संपर्क करें',
    modalSubtitle: 'कोई सवाल है या संपर्क करना चाहते हैं? नीचे दिया गया फ़ॉर्म भरें।',
    fieldName: 'पूरा नाम*',
    fieldEmail: 'ईमेल*',
    fieldPhone: 'फ़ोन',
    fieldCompany: 'कंपनी',
    fieldMessage: 'संदेश*',
    placeholderName: 'आपका नाम',
    placeholderCompany: 'कंपनी का नाम',
    placeholderMessage: 'हम आपकी कैसे मदद कर सकते हैं?',
    send: 'संदेश भेजें',
    sending: 'भेजा जा रहा है…',
    sendAnother: 'एक और संदेश भेजें',
    close: 'बंद करें',
    successTitle: 'संपर्क करने के लिए धन्यवाद!',
    successBody: 'हमें आपका संदेश मिल गया है और हम जल्द ही आपसे संपर्क करेंगे।',
    genericError: 'कुछ गलत हो गया। कृपया बाद में पुनः प्रयास करें।',
  },
  faq: {
    heading: 'अक्सर पूछे जाने वाले प्रश्न',
    items: [
      {
        q: 'क्रैली क्या है?',
        a: 'क्रैली एक ठेकेदार सत्यापन प्लेटफ़ॉर्म है जो व्यवसायों को नियुक्ति से पहले सत्यापित व्यावसायिक जानकारी, कार्य इतिहास और अनुपालन विवरण के माध्यम से श्रम ठेकेदारों का मूल्यांकन करने में मदद करता है।',
      },
      {
        q: 'क्रैली का उपयोग कौन कर सकता है?',
        intro: 'क्रैली इनके लिए बनाया गया है:',
        list: [
          'निर्माता',
          'ईपीसी और इंजीनियरिंग कंपनियां',
          'निर्माण कंपनियां',
          'बुनियादी ढांचा कंपनियां',
          'वेयरहाउसिंग और लॉजिस्टिक्स व्यवसाय',
          'श्रम ठेकेदार',
        ],
      },
      {
        q: 'व्यवसायों को क्रैली का उपयोग क्यों करना चाहिए?',
        a: 'सही ठेकेदार को नियुक्त करना परियोजना की सफलता के लिए महत्वपूर्ण है। क्रैली एक ही जगह विश्वसनीय ठेकेदार जानकारी देकर व्यवसायों को सूचित निर्णय लेने में मदद करता है।',
      },
      {
        q: 'ठेकेदारों का सत्यापन कैसे होता है?',
        a: 'ठेकेदार अपनी व्यावसायिक जानकारी और सहायक दस्तावेज़ जमा करते हैं। हमारी सत्यापन प्रक्रिया एक विश्वसनीय प्रोफ़ाइल बनाने में मदद करती है जिसे व्यवसाय देख सकते हैं।',
      },
    ],
  },
  footer: {
    tagline: 'पहली कॉल से पहले भरोसा बनाना।',
    subtext: 'आधुनिक व्यवसायों के लिए सत्यापित ठेकेदार प्रोफ़ाइल।',
    navHeading: 'नेविगेशन',
    navTrust: 'विश्वास अनुभाग',
    navWhy: 'क्रैली क्यों',
    navHow: 'यह कैसे काम करता है',
    navFaq: 'सामान्य प्रश्न',
    navContact: 'संपर्क करें',
    address: 'बदनेरा रोड, तापड़िया सिटी सेंटर मॉल के सामने, सतुर्ना, अमरावती, महाराष्ट्र 444607',
    phone: '+91 95032 52288',
    email: 'hello@craly.com',
    copyright: '© 2026 क्रैली. सर्वाधिकार सुरक्षित.',
  },
  nav: {
    home: 'होम',
    contractors: 'ठेकेदार',
    whyCraly: 'क्रैली क्यों',
    howItWorks: 'यह कैसे काम करता है',
    faq: 'सामान्य प्रश्न',
    dashboard: 'डैशबोर्ड',
    login: 'लॉग इन',
    logout: 'लॉग आउट',
    getStarted: 'शुरू करें',
  },
  auth: {
    networkEyebrow: 'एक सत्यापित नेटवर्क',
    loginHeading: 'भरोसा बनाना जारी रखें, वहीं से जहां आपने छोड़ा था।',
    signupHeading: 'खोजे जाएं — या जिन्हें आपकी ज़रूरत है उन्हें खोजें।',
    contractorRoleTitle: 'ठेकेदार',
    contractorRoleDesc: 'सत्यापित प्रोफ़ाइल बनाएं और काम पाएं',
    businessRoleTitle: 'व्यवसाय',
    businessRoleDesc: 'आत्मविश्वास से खोजें और नियुक्त करें',
    securityBadge: 'आपका खाता और व्यावसायिक विवरण सुरक्षित रहते हैं।',
    welcomeBackEyebrow: 'वापसी पर स्वागत है',
    logInTitle: 'लॉग इन करें',
    createAccountEyebrow: 'खाता बनाएं',
    joinTitle: 'क्रैली में शामिल हों',
    emailLabel: 'ईमेल',
    emailPlaceholder: 'you@company.com',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: '••••••••',
    confirmPasswordLabel: 'पासवर्ड की पुष्टि करें',
    confirmPasswordPlaceholder: '••••••••',
    companyNameLabel: 'कंपनी का नाम',
    companyNamePlaceholder: 'एक्मे प्राइवेट लिमिटेड',
    forgotPassword: 'पासवर्ड भूल गए?',
    loggingIn: 'लॉग इन हो रहा है…',
    logInBtn: 'लॉग इन करें',
    creatingAccount: 'खाता बनाया जा रहा है…',
    createAccountBtn: 'खाता बनाएं',
    newToCraly: 'क्रैली पर नए हैं?',
    alreadyHaveAccount: 'पहले से ही एक खाता है?',
    joinAsContractor: 'ठेकेदार के रूप में जुड़ें',
    joinAsBusiness: 'व्यवसाय के रूप में जुड़ें',
    iamContractor: 'मैं एक ठेकेदार हूं',
    iamBusiness: 'मैं एक व्यवसाय हूं',
  },
  contractors: {
    pageTitle: 'श्रम ठेकेदारों को खोजें',
    pageSubtitle: 'निर्माण, मैन्युफैक्चरिंग और प्लांट संचालन के लिए भारत भर में सत्यापित ठेकेदारों की खोज करें।',
    searchPlaceholder: 'नाम, शहर या सेवा द्वारा ठेकेदारों की खोज करें...',
    filterTitle: 'ठेकेदारों को फ़िल्टर करें',
    filterState: 'राज्य',
    allStates: 'सभी राज्य',
    filterCategory: 'श्रेणी',
    allCategories: 'सभी श्रेणियां',
    minExperience: 'न्यूनतम अनुभव (वर्ष)',
    minWorkforce: 'न्यूनतम कार्यबल क्षमता',
    anyExperience: 'कोई भी अनुभव',
    anyWorkforce: 'कोई भी क्षमता',
    applyFilters: 'फ़िल्टर लागू करें',
    clearFilters: 'फ़िल्टर हटाएं',
    foundCount: 'ठेकेदार मिले',
    noResultsTitle: 'कोई ठेकेदार नहीं मिला',
    noResultsDesc: 'कृपया अपने खोज मापदंड बदलें या फ़िल्टर साफ़ करें।',
    viewProfile: 'प्रोफ़ाइल देखें',
    sendEnquiry: 'पूछताछ भेजें',
    verifiedBadge: 'सत्यापित',
    workforceLabel: 'कार्यबल',
    experienceLabel: 'अनुभव',
    prevPage: 'पिछला',
    nextPage: 'अगला',
    pageOf: 'पृष्ठ',
  },
  contractorDetail: {
    backToDirectory: '← ठेकेदारों की सूची पर वापस जाएं',
    tabOverview: 'अवलोकन',
    tabWorkforce: 'कार्यबल',
    tabLicenses: 'लाइसेंस और अनुपालन',
    tabProjects: 'परियोजनाएं और अनुभव',
    tabReviews: 'समीक्षाएं और रेटिंग',
    contactBtn: 'ठेकेदार से संपर्क करें',
    companyInfoTitle: 'कंपनी अवलोकन',
    gstinLabel: 'जीएसटीआयएन (GSTIN)',
    panLabel: 'पैन (PAN)',
    addressLabel: 'पता',
    statesLabel: 'संचालन के राज्य',
    workforceTitle: 'कार्यबल क्षमता',
    totalWorkers: 'कुल कार्यबल',
    skilledWorkers: 'कुशल श्रमिक',
    unskilledWorkers: 'अकुशल श्रमिक',
    licensesTitle: 'अनुपालन और पंजीकरण',
    licenseType: 'दस्तावेज़ / लाइसेंस',
    licenseNumber: 'लाइसेंस नंबर',
    validTill: 'कब तक वैध',
    projectsTitle: 'पिछली परियोजनाएं और इतिहास',
    reviewsTitle: 'व्यावसायिक रेटिंग और प्रतिक्रिया',
    contactModalTitle: 'पूछताछ भेजें',
    contactModalSub: 'परियोजना कार्यबल की आवश्यकताओं पर चर्चा करने के लिए सीधे संपर्क करें।',
    subjectLabel: 'विषय',
    messageLabel: 'संदेश और परियोजना आवश्यकताएं',
    sendBtn: 'संदेश भेजें',
    sendingBtn: 'भेजा जा रहा है…',
    enquirySentSuccess: 'पूछताछ सफलतापूर्वक भेजी गई!',
  },
  businessDashboard: {
    welcome: 'वापसी पर स्वागत है',
    subtitle: 'अपनी ठेकेदार पूछताछ प्रबंधित करें और सत्यापित टीमों की खोज करें।',
    statEnquiries: 'कुल पूछताछ',
    statSaved: 'सहेजी गई प्रोफ़ाइल',
    statHired: 'सक्रिय अनुबंध',
    searchHeroTitle: 'श्रम ठेकेदारों की आवश्यकता है?',
    searchHeroSub: 'अपने प्लांट, फ़ैक्टरी या प्रोजेक्ट निष्पादन के लिए सत्यापित ठेकेदार खोजें।',
    recentEnquiriesTitle: 'हाल की पूछताछ',
    viewAllEnquiries: 'सभी पूछताछ देखें',
    contractorCol: 'ठेकेदार',
    dateCol: 'दिनांक',
    statusCol: 'स्थिति',
    actionCol: 'कार्रवाई',
    noEnquiries: 'अभी तक कोई पूछताछ नहीं भेजी गई। ठेकेदारों से संपर्क करने के लिए खोजना शुरू करें!',
  },
  contractorDashboard: {
    welcome: 'वापसी पर स्वागत है',
    subtitle: 'अपनी सत्यापित व्यावसायिक प्रोफ़ाइल और ग्राहक पूछताछ प्रबंधित करें।',
    profileStatusTitle: 'प्रोफ़ाइल स्थिति',
    verificationStatus: 'सत्यापन स्थिति',
    verified: 'सत्यापित प्रोफ़ाइल',
    pendingVerification: 'सत्यापन लंबित',
    incomplete: 'अपूर्ण प्रोफ़ाइल',
    completenessLabel: 'प्रोफ़ाइल पूर्णता',
    completeOnboardingBtn: 'ऑनबोर्डिंग प्रोफ़ाइल पूरी करें',
    statEnquiriesReceived: 'प्राप्त पूछताछ',
    statProfileViews: 'प्रोफ़ाइल व्यूज',
    recentEnquiriesTitle: 'प्राप्त पूछताछ',
    viewDetails: 'विवरण देखें',
  },
  enquiries: {
    pageTitle: 'पूछताछ',
    pageSubtitle: 'व्यवसायों और ठेकेदारों के बीच संदेशों और संचार को ट्रैक करें।',
    allTab: 'सभी पूछताछ',
    pendingTab: 'लंबित',
    respondedTab: 'उत्तर दिया गया',
    closedTab: 'बंद',
    statusPending: 'लंबित',
    statusResponded: 'उत्तर दिया गया',
    statusClosed: 'बंद',
    subject: 'विषय',
    date: 'दिनांक',
    messageHistory: 'संदेश इतिहास',
    typeReplyPlaceholder: 'अपना जवाब यहां लिखें...',
    sendReplyBtn: 'जवाब भेजें',
    sendingReply: 'भेजा जा रहा है...',
    updateStatusBtn: 'स्थिति अपडेट करें',
    emptyEnquiries: 'इस श्रेणी में कोई पूछताछ नहीं मिली।',
  },
  onboarding: {
    pageTitle: 'अपनी व्यावसायिक प्रोफ़ाइल पूरी करें',
    pageSubtitle: 'क्रैली पर अपना सत्यापित बैज प्राप्त करने के लिए आधिकारिक व्यावसायिक विवरण प्रदान करें।',
    stepCompany: 'व्यावसायिक जानकारी',
    stepDetails: 'कार्यबल और क्षमता',
    stepDocs: 'दस्तावेज़ और सत्यापन',
    companyName: 'कंपनी / व्यवसाय का नाम',
    stateOfOperation: 'संचालन के राज्य',
    gstin: 'जीएसटीआयएन पंजीकरण संख्या',
    pan: 'पैन संख्या',
    workforceCapacity: 'कुल कार्यबल क्षमता',
    categories: 'श्रेणियां और सेवाएं',
    saveAndContinue: 'सहेजें और जारी रखें',
    submitting: 'सहेजा जा रहा है...',
    completeSetup: 'सेटअप पूरा करें',
  },
  notifications: {
    pageTitle: 'सूचनाएं',
    markAllRead: 'सभी को पढ़ा हुआ चिन्हित करें',
    emptyState: 'इस समय कोई सूचना नहीं है।',
    newEnquiry: 'नई पूछताछ प्राप्त हुई',
  },
  common: {
    loading: 'लोड हो रहा है...',
    error: 'कुछ गलत हो गया',
    tryAgain: 'पुनः प्रयास करें',
    back: 'वापस',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    close: 'बंद करें',
  },
};

const mr: Translations = {
  hero: {
    badgeVerified: 'सत्यापित ठेकेदार',
    badgeTrusted: 'विश्वासार्ह लोक',
    headlinePrefix: 'कामगार ठेकेदार ',
    headlineAccent: 'शोधण्याचा',
    headlineSuffix: ' स्मार्ट मार्ग',
    subtext: 'आधुनिक व्यवसायांसाठी सत्यापित ठेकेदार प्रोफाइल. पहिल्या कॉलपूर्वी विश्वास निर्माण करा.',
    ctaFind: 'ठेकेदार शोधा',
    ctaJoin: 'ठेकेदार म्हणून सामील व्हा',
  },
  trust: {
    eyebrow: 'विश्वासार्ह माहिती',
    heading: 'ठेकेदाराचे मूल्यांकन करण्यासाठी आवश्यक सर्व काही एकाच ठिकाणी',
  },
  roleSelect: {
    eyebrow: 'सुरुवात करा',
    heading: 'तुम्ही कोणत्या बाजूला आहात?',
    contractorTitle: 'मी एक ठेकेदार आहे',
    contractorDesc: 'सत्यापित प्रोफाइल तयार करा आणि नियुक्ती करणाऱ्या व्यवसायांना सापडा.',
    contractorAction: 'ठेकेदार प्रोफाइल तयार करा',
    businessTitle: 'मी एक व्यवसाय आहे',
    businessDesc: 'आत्मविश्वासाने सत्यापित, विश्वासार्ह ठेकेदार शोधा आणि नियुक्त करा.',
    businessAction: 'ठेकेदार पहा',
  },
  carousel: {
    business: 'व्यवसाय पडताळणी',
    license: 'परवाने आणि अनुपालन',
    workforce: 'कामगार तपशील',
    projects: 'प्रकल्प इतिहास',
    ratings: 'रेटिंग आणि पुनरावलोकने',
    documents: 'सत्यापित कागदपत्रे',
  },
  whyCraly: {
    eyebrow: 'क्रैली का',
    heading: 'अधिक चांगले ठेकेदार निर्णय घ्या',
    badges: [
      'नियुक्तीचा धोका कमी करा',
      'ठेकेदार पारदर्शकता वाढवा',
      'मूल्यांकनादरम्यान वेळ वाचवा',
      'आत्मविश्वासाने निर्णय घ्या',
    ],
  },
  howItWorks: {
    eyebrow: 'हे कसे कार्य करते',
    heading: 'एक सोपी पडताळणी प्रक्रिया',
    steps: [
      {
        title: 'ठेकेदार प्रोफाइल तयार करतो',
        text: 'ठेकेदार त्यांचा व्यवसाय नोंदणी करतात आणि कंपनीची माहिती सादर करतात.',
      },
      {
        title: 'माहितीची पडताळणी केली जाते',
        text: 'व्यवसायाचे तपशील, कागदपत्रे आणि अनुपालन माहितीचे पुनरावलोकन आणि पडताळणी केली जाते.',
      },
      {
        title: 'विश्वासार्ह प्रोफाइल तयार करा',
        text: 'सत्यापित ठेकेदार प्रोफाइल व्यवसाय माहिती, अनुभव आणि कामाचा इतिहास दर्शवते.',
      },
      {
        title: 'आत्मविश्वासाने नियुक्त करा',
        text: 'व्यवसाय सत्यापित प्रोफाइलचे पुनरावलोकन करतात आणि आत्मविश्वासाने योग्य ठेकेदाराशी संपर्क साधतात.',
      },
    ],
  },
  builtFor: {
    eyebrow: 'यांच्यासाठी तयार केले',
    heading: 'भारताच्या औद्योगिक परिसंस्थेसाठी डिझाइन केलेले',
    slides: [
      {
        title: 'उत्पादक',
        text: 'उत्पादन आणि प्लांट कामकाजासाठी विश्वासार्ह कामगार ठेकेदार शोधा.',
      },
      {
        title: 'ईपीसी आणि अभियांत्रिकी कंपन्या',
        text: 'प्रकल्प अंमलबजावणीपूर्वी ठेकेदारांचे मूल्यांकन करा.',
      },
      {
        title: 'पायाभूत सुविधा आणि बांधकाम',
        text: 'काम देण्यापूर्वी ठेकेदार प्रोफाइलचे पुनरावलोकन करा.',
      },
      {
        title: 'कामगार ठेकेदार',
        text: 'विश्वास निर्माण करा, अनुभव दाखवा आणि तुमचा व्यवसाय वाढवा.',
      },
    ],
  },
  contact: {
    eyebrow: 'संपर्क करा',
    heading: 'काही प्रश्न आहे? बोलूया.',
    subtext:
      'तुम्ही नियुक्ती करू इच्छिणारा व्यवसाय असाल किंवा पडताळणीसाठी तयार ठेकेदार असाल — आम्हाला संदेश पाठवा आणि आमची टीम तुमच्याशी संपर्क साधेल.',
    modalTitle: 'संपर्क करा',
    modalSubtitle: 'काही प्रश्न आहे किंवा संपर्क साधायचा आहे? खालील फॉर्म भरा.',
    fieldName: 'पूर्ण नाव*',
    fieldEmail: 'ईमेल*',
    fieldPhone: 'फोन',
    fieldCompany: 'कंपनी',
    fieldMessage: 'संदेश*',
    placeholderName: 'तुमचे नाव',
    placeholderCompany: 'कंपनीचे नाव',
    placeholderMessage: 'आम्ही तुम्हाला कशी मदत करू शकतो?',
    send: 'संदेश पाठवा',
    sending: 'पाठवत आहे…',
    sendAnother: 'आणखी एक संदेश पाठवा',
    close: 'बंद करा',
    successTitle: 'संपर्क साधल्याबद्दल धन्यवाद!',
    successBody: 'आम्हाला तुमचा संदेश मिळाला आहे आणि आम्ही लवकरच तुमच्याशी संपर्क साधू.',
    genericError: 'काहीतरी चुकले. कृपया नंतर पुन्हा प्रयत्न करा.',
  },
  faq: {
    heading: 'वारंवार विचारले जाणारे प्रश्न',
    items: [
      {
        q: 'क्रैली म्हणजे काय?',
        a: 'क्रैली हे एक ठेकेदार पडताळणी प्लॅटफॉर्म आहे जे व्यवसायांना नियुक्तीपूर्वी सत्यापित व्यवसाय माहिती, कामाचा इतिहास आणि अनुपालन तपशीलांद्वारे कामगार ठेकेदारांचे मूल्यांकन करण्यास मदत करते.',
      },
      {
        q: 'क्रैलीचा वापर कोण करू शकतो?',
        intro: 'क्रैली यांच्यासाठी तयार केले आहे:',
        list: [
          'उत्पादक',
          'ईपीसी आणि अभियांत्रिकी कंपन्या',
          'बांधकाम कंपन्या',
          'पायाभूत सुविधा कंपन्या',
          'वेअरहाउसिंग आणि लॉजिस्टिक्स व्यवसाय',
          'कामगार ठेकेदार',
        ],
      },
      {
        q: 'व्यवसायांनी क्रैलीचा वापर का करावा?',
        a: 'योग्य ठेकेदार नियुक्त करणे प्रकल्पाच्या यशासाठी महत्त्वाचे आहे. क्रैली एकाच ठिकाणी विश्वासार्ह ठेकेदार माहिती देऊन व्यवसायांना माहितीपूर्ण निर्णय घेण्यास मदत करते.',
      },
      {
        q: 'ठेकेदारांची पडताळणी कशी केली जाते?',
        a: 'ठेकेदार त्यांची व्यवसाय माहिती आणि सहाय्यक कागदपत्रे सादर करतात. आमची पडताळणी प्रक्रिया एक विश्वासार्ह प्रोफाइल तयार करण्यास मदत करते जे व्यवसाय पाहू शकतात.',
      },
    ],
  },
  footer: {
    tagline: 'पहिल्या कॉलपूर्वी विश्वास निर्माण करणे.',
    subtext: 'आधुनिक व्यवसायांसाठी सत्यापित ठेकेदार प्रोफाइल.',
    navHeading: 'नेव्हिगेशन',
    navTrust: 'विश्वास विभाग',
    navWhy: 'क्रैली का',
    navHow: 'हे कसे कार्य करते',
    navFaq: 'सामान्य प्रश्न',
    navContact: 'संपर्क करा',
    address: 'बदनेरा रोड, तापडिया सिटी सेंटर मॉलसमोर, सातुर्णा, अमरावती, महाराष्ट्र 444607',
    phone: '+91 95032 52288',
    email: 'hello@craly.com',
    copyright: '© 2026 क्रैली. सर्व हक्क राखीव.',
  },
  nav: {
    home: 'होम',
    contractors: 'ठेकेदार',
    whyCraly: 'क्रैली का',
    howItWorks: 'हे कसे कार्य करते',
    faq: 'सामान्य प्रश्न',
    dashboard: 'डॅशबोर्ड',
    login: 'लॉग इन',
    logout: 'लॉग आउट',
    getStarted: 'सुरुवात करा',
  },
  auth: {
    networkEyebrow: 'एक सत्यापित नेटवर्क',
    loginHeading: 'विश्वास निर्माण करणे सुरू ठेवा, जिथून तुम्ही सोडले होते.',
    signupHeading: 'शोधले जा — किंवा तुम्हाला हवे असलेले शोधा.',
    contractorRoleTitle: 'ठेकेदार',
    contractorRoleDesc: 'सत्यापित प्रोफाइल तयार करा आणि काम मिळवा',
    businessRoleTitle: 'व्यवसाय',
    businessRoleDesc: 'आत्मविश्वासाने शोधा आणि नियुक्त करा',
    securityBadge: 'तुमचे खाते आणि व्यवसाय तपशील सुरक्षित राहतात.',
    welcomeBackEyebrow: 'पुन्हा स्वागत आहे',
    logInTitle: 'लॉग इन करा',
    createAccountEyebrow: 'खाते तयार करा',
    joinTitle: 'क्रैलीमध्ये सामील व्हा',
    emailLabel: 'ईमेल',
    emailPlaceholder: 'you@company.com',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: '••••••••',
    confirmPasswordLabel: 'पासवर्डची पुष्टी करा',
    confirmPasswordPlaceholder: '••••••••',
    companyNameLabel: 'कंपनीचे नाव',
    companyNamePlaceholder: 'अॅक्मे प्रायव्हेट लिमिटेड',
    forgotPassword: 'पासवर्ड विसरलात?',
    loggingIn: 'लॉग इन होत आहे…',
    logInBtn: 'लॉग इन करा',
    creatingAccount: 'खाते तयार होत आहे…',
    createAccountBtn: 'खाते तयार करा',
    newToCraly: 'क्रैलीवर नवीन आहात?',
    alreadyHaveAccount: 'आधीच खाते आहे का?',
    joinAsContractor: 'ठेकेदार म्हणून सामील व्हा',
    joinAsBusiness: 'व्यवसाय म्हणून सामील व्हा',
    iamContractor: 'मी एक ठेकेदार आहे',
    iamBusiness: 'मी एक व्यवसाय आहे',
  },
  contractors: {
    pageTitle: 'कामगार ठेकेदार शोधा',
    pageSubtitle: 'बांधकाम, उत्पादन आणि प्लांट कामकाजासाठी संपूर्ण भारतातील सत्यापित ठेकेदार शोधा.',
    searchPlaceholder: 'नाव, शहर किंवा सेवेनुसार ठेकेदार शोधा...',
    filterTitle: 'ठेकेदार फिल्टर करा',
    filterState: 'राज्य',
    allStates: 'सर्व राज्ये',
    filterCategory: 'श्रेणी',
    allCategories: 'सर्व श्रेणी',
    minExperience: 'किमान अनुभव (वर्षे)',
    minWorkforce: 'किमान कामगार क्षमता',
    anyExperience: 'कोणताही अनुभव',
    anyWorkforce: 'कोणतीही क्षमता',
    applyFilters: 'फिल्टर लागू करा',
    clearFilters: 'फिल्टर साफ करा',
    foundCount: 'ठेकेदार सापडले',
    noResultsTitle: 'कोणतेही ठेकेदार सापडले नाहीत',
    noResultsDesc: 'कृपया तुमचे शोध निकष बदला किंवा फिल्टर साफ करा.',
    viewProfile: 'प्रोफाइल पहा',
    sendEnquiry: 'चौकशी पाठवा',
    verifiedBadge: 'सत्यापित',
    workforceLabel: 'कामगार',
    experienceLabel: 'अनुभव',
    prevPage: 'मागील',
    nextPage: 'पुढील',
    pageOf: 'पृष्ठ',
  },
  contractorDetail: {
    backToDirectory: '← ठेकेदारांच्या यादीवर परत जा',
    tabOverview: 'आढावा',
    tabWorkforce: 'कामगार क्षमता',
    tabLicenses: 'परवाने आणि अनुपालन',
    tabProjects: 'प्रकल्प आणि अनुभव',
    tabReviews: 'पुनरावलोकने आणि रेटिंग',
    contactBtn: 'ठेकेदाराशी संपर्क साधा',
    companyInfoTitle: 'कंपनीचा आढावा',
    gstinLabel: 'जीएसटीआयएन (GSTIN)',
    panLabel: 'पॅन (PAN)',
    addressLabel: 'पत्ता',
    statesLabel: 'कामकाजाची राज्ये',
    workforceTitle: 'कामगार क्षमता',
    totalWorkers: 'एकूण कामगार',
    skilledWorkers: 'कुशल कामगार',
    unskilledWorkers: 'अकुशल कामगार',
    licensesTitle: 'अनुपालन आणि नोंदणी',
    licenseType: 'कागदपत्र / परवाना',
    licenseNumber: 'परवाना क्रमांक',
    validTill: 'पर्यंत वैध',
    projectsTitle: 'मागील प्रकल्प आणि इतिहास',
    reviewsTitle: 'व्यवसाय रेटिंग आणि अभिप्राय',
    contactModalTitle: 'चौकशी पाठवा',
    contactModalSub: 'प्रकल्प कामगारांच्या गरजांवर चर्चा करण्यासाठी थेट संपर्क साधा.',
    subjectLabel: 'विषय',
    messageLabel: 'संदेश आणि प्रकल्प गरजा',
    sendBtn: 'संदेश पाठवा',
    sendingBtn: 'पाठवत आहे…',
    enquirySentSuccess: 'चौकशी यशस्वीरित्या पाठवली!',
  },
  businessDashboard: {
    welcome: 'पुन्हा स्वागत आहे',
    subtitle: 'तुमच्या ठेकेदार चौकशा व्यवस्थापित करा आणि सत्यापित टीम्स शोधा.',
    statEnquiries: 'एकूण चौकशा',
    statSaved: 'जतन केलेले प्रोफाइल',
    statHired: 'सक्रिय कंत्राट',
    searchHeroTitle: 'कामगार ठेकेदारांची गरज आहेका?',
    searchHeroSub: 'तुमच्या प्लांट, कारखान्यासाठी किंवा प्रकल्पासाठी सत्यापित ठेकेदार शोधा.',
    recentEnquiriesTitle: 'अलीकडील चौकशा',
    viewAllEnquiries: 'सर्व चौकशा पहा',
    contractorCol: 'ठेकेदार',
    dateCol: 'तारीख',
    statusCol: 'स्थिती',
    actionCol: 'कृती',
    noEnquiries: 'अद्याप कोणतीही चौकशी पाठवली नाही. ठेकेदारांशी संपर्क साधण्यासाठी शोध सुरू करा!',
  },
  contractorDashboard: {
    welcome: 'पुन्हा स्वागत आहे',
    subtitle: 'तुमचे सत्यापित व्यवसाय प्रोफाइल आणि ग्राहक चौकशा व्यवस्थापित करा.',
    profileStatusTitle: 'प्रोफाइल स्थिती',
    verificationStatus: 'सत्यापन स्थिती',
    verified: 'सत्यापित प्रोफाइल',
    pendingVerification: 'सत्यापन प्रलंबित',
    incomplete: 'अपूर्ण प्रोफाइल',
    completenessLabel: 'प्रोफाइल पूर्णता',
    completeOnboardingBtn: 'ऑनबोर्डिंग प्रोफाइल पूर्ण करा',
    statEnquiriesReceived: 'मिळालेल्या चौकशा',
    statProfileViews: 'प्रोफाइल व्ह्यूज',
    recentEnquiriesTitle: 'प्राप्त चौकशा',
    viewDetails: 'तपशील पहा',
  },
  enquiries: {
    pageTitle: 'चौकशा',
    pageSubtitle: 'व्यवसाय आणि ठेकेदारांमधील संदेश आणि संवाद ट्रॅक करा.',
    allTab: 'सर्व चौकशा',
    pendingTab: 'प्रलंबित',
    respondedTab: 'उत्तर दिलेले',
    closedTab: 'बंद',
    statusPending: 'प्रलंबित',
    statusResponded: 'उत्तर दिलेले',
    statusClosed: 'बंद',
    subject: 'विषय',
    date: 'तारीख',
    messageHistory: 'संदेश इतिहास',
    typeReplyPlaceholder: 'तुमचे उत्तर येथे लिहा...',
    sendReplyBtn: 'उत्तर पाठवा',
    sendingReply: 'पाठवत आहे...',
    updateStatusBtn: 'स्थिती अपडेट करा',
    emptyEnquiries: 'या प्रकारात कोणतीही चौकशी सापडली नाही.',
  },
  onboarding: {
    pageTitle: 'तुमचे व्यवसाय प्रोफाइल पूर्ण करा',
    pageSubtitle: 'क्रैलीवर तुमचे सत्यापित बॅज मिळवण्यासाठी अधिकृत व्यवसाय तपशील प्रदान करा.',
    stepCompany: 'व्यवसाय माहिती',
    stepDetails: 'कामगार आणि क्षमता',
    stepDocs: 'कागदपत्रे आणि पडताळणी',
    companyName: 'कंपनी / व्यवसायाचे नाव',
    stateOfOperation: 'कामकाजाची राज्ये',
    gstin: 'जीएसटीआयएन नोंदणी क्रमांक',
    pan: 'पॅन क्रमांक',
    workforceCapacity: 'एकूण कामगार क्षमता',
    categories: 'श्रेणी आणि सेवा',
    saveAndContinue: 'जतन करा आणि पुढे जा',
    submitting: 'जतन करत आहे...',
    completeSetup: 'सेटअप पूर्ण करा',
  },
  notifications: {
    pageTitle: 'सूचना',
    markAllRead: 'सर्व वाचलेले म्हणून चिन्हांकित करा',
    emptyState: 'यावेळी कोणतीही सूचना नाही.',
    newEnquiry: 'नवीन चौकशी प्राप्त झाली',
  },
  common: {
    loading: 'लोड होत आहे...',
    error: 'काहीतरी चुकले',
    tryAgain: 'पुन्हा प्रयत्न करा',
    back: 'मागे',
    save: 'जतन करा',
    cancel: 'रद्द करा',
    close: 'बंद करा',
  },
};

export const translations: Record<Language, Translations> = { en, hi, mr };
