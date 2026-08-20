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
};

export const translations: Record<Language, Translations> = { en, hi, mr };
