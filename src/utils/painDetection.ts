// Clinical pain detection and body map update utility
import { getPatientName } from './careCircleStorage';

export type BodyPartKey = 'head' | 'shoulder' | 'heart' | 'back' | 'stomach' | 'knee' | 'feet';

export type PainStatus = 'active' | 'moderate' | 'improving' | 'resolved' | 'none';

export interface BodyPartObservation {
  label: string;
  note: string;
  color: string;
  rec: string;
  reportedAt?: string;
  isPainActive?: boolean;
  painStatus?: PainStatus; // 'active' (red dot) | 'moderate' (orange dot) | 'improving' (green dot) | 'resolved' (no dot) | 'none'
  condition?: string;
  source?: string;
  lastPatientFeedback?: string;
  reliefTablets?: string[];
}

export const INITIAL_BODY_OBSERVATIONS: Record<BodyPartKey, BodyPartObservation> = {
  head: {
    label: 'Head (Clear Mind)',
    note: 'Excellent mental clarity baseline',
    color: '#10b981',
    rec: 'Mental clarity is at an excellent baseline. Continue daily morning mindfulness and regular sleep schedule.',
    painStatus: 'none',
    isPainActive: false,
  },
  shoulder: {
    label: 'Shoulder & Arms (Comfortable)',
    note: 'Good range of motion, no stiffness reported',
    color: '#10b981',
    rec: 'Joint flexibility is stable. Gentle arm raises during morning routine help maintain mobility.',
    painStatus: 'none',
    isPainActive: false,
  },
  heart: {
    label: 'Heart & Chest (Cardiovascular Care)',
    note: 'Resting pulse 72 bpm, blood pressure monitoring',
    color: '#10b981',
    rec: 'Continue prescribed cardiac medications and low-sodium nutrition. Rest quietly if exertional discomfort occurs.',
    painStatus: 'none',
    isPainActive: false,
  },
  back: {
    label: 'Back & Spine (Aligned)',
    note: 'Posture stable with good lumbar support',
    color: '#10b981',
    rec: 'Maintain supportive sitting posture. Gentle pelvic tilts and short walks relieve lower spine pressure.',
    painStatus: 'none',
    isPainActive: false,
  },
  stomach: {
    label: 'Stomach (Digestive Care)',
    note: 'Digestion stable, hydrate with warm water',
    color: '#10b981',
    rec: 'Hydrate with warm ginger or cumin water after meals. Avoid heavy or oily dinners.',
    painStatus: 'none',
    isPainActive: false,
  },
  knee: {
    label: 'Knee & Legs (Joint Care)',
    note: 'Mild physical fatigue during morning walk',
    color: '#ef4444',
    rec: 'Knee stiffness documented. Recommended Glucosamine joint tablet after lunch & warm compresses.',
    painStatus: 'active',
    isPainActive: true,
    condition: 'Mild Knee Joint Stiffness',
    reliefTablets: ['Glucosamine Joint Support 500mg'],
  },
  feet: {
    label: 'Feet & Ankles (Healthy Circulation)',
    note: 'Normal peripheral temperature, no edema',
    color: '#10b981',
    rec: 'Circulation in lower extremities is healthy. Keep feet warm and wear non-skid supportive slippers.',
    painStatus: 'none',
    isPainActive: false,
  },
};

export const CLINICAL_PAIN_GUIDELINES: Record<
  BodyPartKey,
  {
    name: string;
    teluguName: string;
    hindiName: string;
    rec: string;
    urgentNotice: string;
  }
> = {
  head: {
    name: 'Head',
    teluguName: 'తల',
    hindiName: 'सिर',
    rec: 'Headache/discomfort logged. Rest in a dim, peaceful room with a glass of water. If throbbing or accompanied by high BP, consult Dr. Roy.',
    urgentNotice: 'Sudden severe headache or visual aura requires immediate caregiver attention.',
  },
  shoulder: {
    name: 'Shoulder',
    teluguName: 'భుజం',
    hindiName: 'कंधा',
    rec: 'Shoulder/arm soreness logged. Support the elbow with a soft cushion, avoid overhead lifting, and apply gentle heat fomentation.',
    urgentNotice: 'Left arm pain radiating from chest requires immediate emergency screening.',
  },
  heart: {
    name: 'Chest / Heart',
    teluguName: 'గుండె / ఛాతీ',
    hindiName: 'छाती / दिल',
    rec: 'Chest sensation logged. Sit upright, unbutton tight collar, take slow nasal breaths, and remain calm while vitals are monitored.',
    urgentNotice: 'Acute chest tightness, pressure, or breathlessness triggers priority Emergency SOS.',
  },
  back: {
    name: 'Back',
    teluguName: 'నడుము / వెన్ను',
    hindiName: 'पीठ / कमर',
    rec: 'Back/lumbar pain logged. Lie down on a supportive firm surface with knees slightly bent. Apply a warm sesame oil compress.',
    urgentNotice: 'Sudden sharp shooting back pain or numbness in legs warrants clinical check.',
  },
  stomach: {
    name: 'Stomach',
    teluguName: 'కడుపు',
    hindiName: 'पेट',
    rec: 'Abdominal pain/cramping logged. Sip lukewarm cumin (jeera) water, rest in a reclined posture, and avoid solid food for 1 hour.',
    urgentNotice: 'Severe persistent abdominal pain or vomiting should be evaluated promptly.',
  },
  knee: {
    name: 'Knee',
    teluguName: 'మోకాలు',
    hindiName: 'घुटना',
    rec: 'Knee joint pain logged. Elevate the leg on a soft footrest, avoid stairs today, and apply a soothing warm towel compress for 15 minutes.',
    urgentNotice: 'Sudden swelling or inability to bear weight on the knee should be checked by caregiver.',
  },
  feet: {
    name: 'Feet / Ankles',
    teluguName: 'పాదాలు',
    hindiName: 'पैर',
    rec: 'Foot/ankle soreness logged. Elevate legs above hip level to relieve pressure, check footwear, and gently massage with herbal balm.',
    urgentNotice: 'Rapid ankle swelling or acute coldness in toes requires medical review.',
  },
};

export interface PainDetectionResult {
  hasPain: boolean;
  bodyPart: BodyPartKey;
  secondaryParts?: BodyPartKey[];
  bodyPartLabel: string;
  symptomSummary: string;
  rec: string;
  severity: 'NORMAL' | 'MILD' | 'MODERATE' | 'SERIOUS' | 'EMERGENCY';
  isEmergency: boolean;
  symptomName: string;
  dotStatus?: PainStatus;
  spokenReply: {
    english: string;
    telugu: string;
    hindi: string;
  };
}

export function detectPainInText(text: string): PainDetectionResult | null {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  // Emergency / Severe indicators
  const isSevere =
    lower.includes('severe') ||
    lower.includes('very bad') ||
    lower.includes('very severe') ||
    lower.includes('hurting very badly') ||
    lower.includes('hurts very badly') ||
    lower.includes('cannot bear') ||
    lower.includes('unbearable') ||
    lower.includes('spinning badly') ||
    lower.includes('cannot breathe') ||
    lower.includes('faint') ||
    lower.includes('fainting') ||
    lower.includes('crushing') ||
    lower.includes('acute') ||
    lower.includes('తీవ్రమైన') ||
    lower.includes('చాలా ఎక్కువ') ||
    lower.includes('భరించలేను') ||
    lower.includes('बहुत तेज') ||
    lower.includes('असहनीय');

  // Words indicating pain, ache, stiffness, discomfort, or health problem
  const generalSymptomKeywords = [
    'pain',
    'paining',
    'hurts',
    'hurting',
    'hurt',
    'ache',
    'aching',
    'sore',
    'soreness',
    'stiff',
    'stiffness',
    'discomfort',
    'cramp',
    'cramping',
    'burning',
    'swelling',
    'swollen',
    'heavy',
    'sprain',
    'dizzy',
    'dizziness',
    'spinning',
    'vertigo',
    'faint',
    'fainting',
    'weakness',
    'weak',
    'breath',
    'breathing',
    'breathless',
    'shortness of breath',
    'nausea',
    'vomiting',
    'నొప్పి',
    'నొప్పులు',
    'బాధ',
    'తీపు',
    'లాగుతుంది',
    'పట్టేసింది',
    'మంట',
    'తిరుగుతుంది',
    'మైకం',
    'నీరసం',
    'శ్వాస',
    'दर्द',
    'तकलीफ',
    'पीड़ा',
    'दुख',
    'दुखना',
    'ऐंठन',
    'सूजन',
    'जकड़न',
    'चक्कर',
    'कमजोरी',
    'सांस',
  ];

  const hasGeneralKeyword = generalSymptomKeywords.some((w) => lower.includes(w));

  // Specific body part keywords
  const bodyPartKeywords: Record<BodyPartKey, string[]> = {
    head: [
      'head',
      'headache',
      'head ache',
      'migraine',
      'temple',
      'forehead',
      'scalp',
      'dizzy',
      'dizziness',
      'spinning',
      'vertigo',
      'lightheaded',
      'faint',
      'fainting',
      'confusion',
      'weakness',
      'feeling weak',
      'stroke',
      'తల',
      'తలనొప్పి',
      'తల నొప్పి',
      'కళ్ళు తిరగడం',
      'మైకం',
      'నీరసం',
      'స్పృహ',
      'सिर',
      'सिरदर्द',
      'सिर दर्द',
      'माथा',
      'चक्कर',
      'बेहोश',
      'कमजोरी',
    ],
    heart: [
      'heart',
      'chest',
      'ribs',
      'breath',
      'breathing',
      'breathing difficulty',
      'difficulty breathing',
      'short of breath',
      'shortness of breath',
      'breathless',
      'cannot breathe',
      'palpitation',
      'racing heart',
      'angina',
      'tightness in chest',
      'pressure in chest',
      'crushing chest',
      'గుండె',
      'ఛాతీ',
      'రొమ్ము',
      'దడ',
      'శ్వాస',
      'శ్వాస ఆడట్లేదు',
      'ఆయాసం',
      'छाती',
      'दिल',
      'सीने',
      'धड़कन',
      'सांस',
      'सांस फूलना',
    ],
    stomach: [
      'stomach',
      'stomachache',
      'stomach pain',
      'belly',
      'belly pain',
      'tummy',
      'abdomen',
      'abdominal',
      'gut',
      'gastric',
      'digest',
      'indigestion',
      'acid',
      'cramp',
      'cramps',
      'nausea',
      'vomiting',
      'కడుపు',
      'పొట్ట',
      'కడుపు నొప్పి',
      'పొట్ట నొప్పి',
      'అజీర్ణం',
      'వాంతులు',
      'గ్యాస్',
      'पेट',
      'पेट दर्द',
      'उदर',
      'मरोड़',
      'उल्टी',
    ],
    shoulder: [
      'shoulder',
      'arm',
      'left arm',
      'elbow',
      'wrist',
      'hand',
      'collarbone',
      'భుజం',
      'చేయి',
      'చెయ్యి',
      'మోచేయి',
      'మణికట్టు',
      'కండరాలు',
      'कंधा',
      'हाथ',
      'बांह',
      'कलाई',
      'कोहनी',
    ],
    back: [
      'back',
      'spine',
      'lumbar',
      'lower back',
      'waist',
      'vertebra',
      'వెన్ను',
      'నడుము',
      'వెన్నుపాము',
      'వీపు',
      'पीठ',
      'कमर',
      'रीढ़',
    ],
    knee: [
      'knee',
      'knees',
      'leg',
      'legs',
      'joint',
      'joints',
      'thigh',
      'calf',
      'walk',
      'walking',
      'మోకాలు',
      'మోకాళ్ళు',
      'కాలు',
      'కాళ్ళు',
      'కీళ్ళు',
      'घुटना',
      'घुटने',
      'पैर',
      'टांग',
      'जोड़',
    ],
    feet: [
      'foot',
      'feet',
      'ankle',
      'heel',
      'toe',
      'toes',
      'sole',
      'soles',
      'పాదం',
      'పాదాలు',
      'చీలమండ',
      'అరికాళ్ళు',
      'एड़ी',
      'टखना',
      'पंजा',
      'तलवे',
    ],
  };

  const matchedParts: BodyPartKey[] = [];

  for (const [part, keywords] of Object.entries(bodyPartKeywords) as [BodyPartKey, string[]][]) {
    if (keywords.some((k) => lower.includes(k))) {
      matchedParts.push(part);
    }
  }

  // If general symptom keyword is present but no specific body part matched, guess from activity or knee
  if (hasGeneralKeyword && matchedParts.length === 0) {
    if (lower.includes('walk') || lower.includes('stand') || lower.includes('step')) {
      matchedParts.push('knee');
    } else if (lower.includes('sit') || lower.includes('lie') || lower.includes('bend')) {
      matchedParts.push('back');
    } else {
      matchedParts.push('knee');
    }
  }

  if (matchedParts.length === 0) return null;

  // Prioritize heart if present, then head
  const primaryPart = matchedParts.includes('heart')
    ? 'heart'
    : matchedParts.includes('head')
    ? 'head'
    : matchedParts[0];

  const secondaryParts = matchedParts.filter((p) => p !== primaryPart);

  // Determine Severity
  let severity: 'NORMAL' | 'MILD' | 'MODERATE' | 'SERIOUS' | 'EMERGENCY' = 'MODERATE';
  if (isSevere || (matchedParts.includes('heart') && matchedParts.includes('head'))) {
    severity = 'EMERGENCY';
  } else if (primaryPart === 'heart' || lower.includes('breath') || lower.includes('faint')) {
    severity = 'SERIOUS';
  } else if (lower.includes('mild') || lower.includes('slight') || lower.includes('కొద్దిగా') || lower.includes('हल्का')) {
    severity = 'MILD';
  } else {
    severity = 'MODERATE';
  }

  const isEmergency = severity === 'EMERGENCY' || severity === 'SERIOUS';
  const info = CLINICAL_PAIN_GUIDELINES[primaryPart];
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  let symptomName = `${info.name} discomfort`;
  if (lower.includes('dizzy') || lower.includes('spinning') || lower.includes('చక్కర్') || lower.includes('మైకం')) {
    symptomName = 'Dizziness & Vertigo';
  } else if (lower.includes('headache') || lower.includes('migraine')) {
    symptomName = 'Headache';
  } else if (lower.includes('breath') || lower.includes('ఆయాసం')) {
    symptomName = 'Breathing difficulty';
  } else if (lower.includes('heart') || lower.includes('chest')) {
    symptomName = 'Heart & Chest discomfort';
  } else if (lower.includes('stomach') || lower.includes('belly')) {
    symptomName = 'Stomach / Abdominal pain';
  } else if (lower.includes('weakness')) {
    symptomName = 'Sudden weakness';
  }

  const labelSuffix = isEmergency ? ' (EMERGENCY ACTIVE)' : ' (Symptom Logged)';
  const patient = getPatientName();
  const isModeratePain =
    lower.includes('heavy') ||
    lower.includes('quite heavy') ||
    lower.includes('moderate') ||
    lower.includes('medium') ||
    lower.includes('కాస్త ఎక్కువ') ||
    lower.includes('మధ్యస్థ');
  const dotStatus: PainStatus = isModeratePain ? 'moderate' : 'active';

  return {
    hasPain: true,
    bodyPart: primaryPart,
    secondaryParts: secondaryParts.length > 0 ? secondaryParts : undefined,
    bodyPartLabel: `${info.name}${labelSuffix}`,
    symptomSummary: `Reported ${symptomName} at ${timeStr}: "${text.trim()}" (Severity: ${severity})`,
    rec: isEmergency ? info.urgentNotice : info.rec,
    severity,
    isEmergency,
    dotStatus,
    symptomName,
    spokenReply: {
      english: isEmergency
        ? `Emergency detected. I have updated your Body Map for ${symptomName} with a red alert dot and initiated an alert to your Care Circle. Please sit down and stay calm.`
        : isModeratePain
        ? `I have updated your Body Map for ${symptomName} with an orange indicator for moderate/heavy pain, ${patient}. Please rest quietly.`
        : `I have updated your Body Map for ${symptomName} with an active red dot, ${patient}. Please sit comfortably and rest.`,
      telugu: isEmergency
        ? `అత్యవసర పరిస్థితి గుర్తించబడింది. మీ ${symptomName} కోసం బాడీ మ్యాప్‌లో ఎరుపు రంగు గుర్తు ఉంచాను మరియు మీ కేర్ సర్కిల్‌కి హెచ్చరిక పంపాను. దయచేసి కూర్చోండి.`
        : `${patient} గారు, మీ ${info.teluguName} సమస్యను బాడీ మ్యాప్‌లో నమోదు చేశాను. దయచేసి విశ్రాంతి తీసుకోండి.`,
      hindi: isEmergency
        ? `आपातकाल का पता चला है। मैंने बॉडी मैप पर ${symptomName} के लिए लाल निशान लगा दिया है और आपके केयर सर्कल को सूचित कर दिया है। कृपया बैठ जाएं।`
        : `${patient} जी, मैंने आपके बॉडी मैप में ${info.hindiName} के लक्षण को अपडेट कर दिया है। कृपया आराम करें।`,
    },
  };
}

// Progress & Resolution Detection: Checks if patient reports pain is improving, resolved, or worsening
export function detectPainProgressInText(
  text: string,
  currentObs?: Record<BodyPartKey, BodyPartObservation>
): {
  hasProgress: boolean;
  bodyPart: BodyPartKey;
  status: PainStatus;
  patientFeedback: string;
  spokenReply: {
    english: string;
    telugu: string;
    hindi: string;
  };
} | null {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();
  const patient = getPatientName();

  // 1. Detect if patient says pain is completely resolved / gone away
  const resolvedPhrases = [
    'completely gone',
    'gone away',
    'went away',
    'pain is gone',
    'knee pain is gone',
    'headache is gone',
    'back pain is gone',
    'chest pain is gone',
    'pain is completely gone',
    'pain gone',
    'is gone',
    'no pain now',
    'no more pain',
    'no pain anymore',
    'don\'t have pain anymore',
    'dont have pain anymore',
    'do not have pain anymore',
    'completely fine',
    'cured',
    'healed',
    'disappeared',
    'vanished',
    'not paining',
    'doesn\'t hurt anymore',
    'does not hurt anymore',
    'fully recovered',
    'all gone',
    'totally fine',
    'పూర్తిగా పోయింది',
    'నొప్పి లేదు',
    'నయమైపోయింది',
    'మొత్తం పోయింది',
    'ఇప్పుడు నొప్పి లేదు',
    'నొప్పి తగ్గింది పూర్తిగా',
    'నొప్పి పోయింది',
    'బిల్కుల్ నయం',
    'బిల్కుల్ పోయింది',
    'बिल्कुल ठीक',
    'दर्द चला गया',
    'अब दर्द नहीं है',
    'दर्द खत्म हो गया',
    'दर्द खत्म',
    'पूरी तरह ठीक',
    'दर्द नहीं हो रहा',
  ];

  // 2. Detect if patient says pain is improving / better / less
  const improvingPhrases = [
    'getting better',
    'is getting better',
    'is better',
    'better now',
    'much better',
    'feeling better',
    'feeling better now',
    'improving',
    'improved',
    'it improved',
    'has improved',
    'it has improved',
    'reduced',
    'has reduced',
    'pain has reduced',
    'pain reduced',
    'the pain has reduced',
    'less pain',
    'pain is less',
    'subsiding',
    'eased',
    'relief',
    'feels better',
    'tolerable',
    'slight pain only',
    'some relief',
    'తగ్గింది',
    'నయమైంది',
    'కాస్త బాగుంది',
    'మెరుగయింది',
    'నొప్పి తగ్గింది',
    'కాస్త నయం',
    'హాయిగా ఉంది',
    'పర్వాలేదు',
    'సులభంగా ఉంది',
    'బాగుంది ఇప్పుడు',
    'సుధార ఉంది',
    'सुधार है',
    'कम हो गया',
    'बेहतर है',
    'आराम मिला',
    'दर्द कम है',
    'सुधर रहा है',
    'पहले से बेहतर',
    'काफी आराम',
  ];

  // 3. Detect if patient says pain is moderate / heavy / quite heavy (Orange Dot)
  const moderatePhrases = [
    'heavy',
    'quite heavy',
    'heavy pain',
    'pain is heavy',
    'pain is quite heavy',
    'moderate',
    'moderate pain',
    'medium pain',
    'getting worse',
    'pain is getting worse',
    'somewhat heavy',
    'మధ్యస్థ',
    'కాస్త ఎక్కువ',
    'ఎక్కువైంది',
    'బాధ ఎక్కువ',
    'తీవ్రం కాస్త',
    'నొప్పి ఎక్కువైంది',
    'నొప్పి కాస్త ఎక్కువ',
    'మధ్యస్థ నొప్పి',
    'మధ్యస్థంగా ఉంది',
    'నొప్పి పెరుగుతోంది',
    'मध्यम दर्द',
    'काफी तेज',
    'दर्द बढ़ रहा',
    'भारी दर्द',
    'काफी भारी',
  ];

  const isResolved =
    resolvedPhrases.some((p) => lower.includes(p)) ||
    (lower.includes('gone') && (lower.includes('pain') || lower.includes('hurt') || lower.includes('ache')));
  const isImproving = improvingPhrases.some((p) => lower.includes(p));
  const isModerate = moderatePhrases.some((p) => lower.includes(p));

  if (!isResolved && !isImproving && !isModerate) {
    return null;
  }

  // Determine status
  const status: PainStatus = isResolved ? 'resolved' : isImproving ? 'improving' : 'moderate';

  // Determine which body part is being discussed
  const bodyPartKeywords: Record<BodyPartKey, string[]> = {
    heart: ['heart', 'chest', 'ribs', 'breath', 'గుండె', 'ఛాతీ', 'छाती', 'दिल'],
    knee: ['knee', 'knees', 'leg', 'legs', 'joint', 'మోకాలు', 'మోకాళ్ళు', 'కీళ్ళు', 'घुटना', 'घुटने'],
    head: ['head', 'headache', 'migraine', 'temple', 'తల', 'తలనొప్పి', 'सिर', 'सिरदर्द'],
    back: ['back', 'spine', 'lumbar', 'waist', 'వెన్ను', 'నడుము', 'पीठ', 'कमर'],
    stomach: ['stomach', 'belly', 'tummy', 'abdomen', 'కడుపు', 'పొట్ట', 'पेट'],
    shoulder: ['shoulder', 'arm', 'hand', 'భుజం', 'చేయి', 'कंधा', 'हाथ'],
    feet: ['foot', 'feet', 'ankle', 'heel', 'పాదాలు', 'పాదం', 'पैर', 'एड़ी'],
  };

  let matchedPart: BodyPartKey | null = null;
  for (const [part, keywords] of Object.entries(bodyPartKeywords) as [BodyPartKey, string[]][]) {
    if (keywords.some((k) => lower.includes(k))) {
      matchedPart = part;
      break;
    }
  }

  // If no body part explicitly mentioned, find the active health issue from localStorage or observations
  if (!matchedPart && typeof window !== 'undefined') {
    const activeIssue = localStorage.getItem('aura_active_health_issue') as BodyPartKey | null;
    if (activeIssue && bodyPartKeywords[activeIssue]) {
      matchedPart = activeIssue;
    }
  }

  if (!matchedPart && currentObs) {
    const activeEntry = (Object.entries(currentObs) as [BodyPartKey, BodyPartObservation][]).find(
      ([, obs]) => obs.painStatus === 'active' || obs.isPainActive || obs.painStatus === 'improving'
    );
    if (activeEntry) {
      matchedPart = activeEntry[0];
    }
  }

  // Default fallback to knee if still unassigned
  if (!matchedPart) {
    matchedPart = 'knee';
  }

  const info = CLINICAL_PAIN_GUIDELINES[matchedPart];

  if (status === 'resolved') {
    return {
      hasProgress: true,
      bodyPart: matchedPart,
      status: 'resolved',
      patientFeedback: text.trim(),
      spokenReply: {
        english: `Wonderful news, ${patient}! I am so delighted that your ${info.name} pain has completely gone away. I have removed the dot from your Body Map and updated your medical records.`,
        telugu: `అద్భుతమైన వార్త ${patient} గారు! మీ ${info.teluguName} నొప్పి పూర్తిగా తగ్గిపోయినందుకు చాలా ఆనందంగా ఉంది. బాడీ మ్యాప్ నుండి గుర్తును తొలగించాను మరియు రికార్డులను అప్‌డేట్ చేశాను.`,
        hindi: `बहुत अच्छी खबर है ${patient} जी! मुझे बहुत खुशी है कि आपके ${info.hindiName} का दर्द पूरी तरह ठीक हो गया है। मैंने बॉडी मैप से निशान हटा दिया है और आपके रिकॉर्ड्स अपडेट कर दिए हैं।`,
      },
    };
  }

  if (status === 'improving') {
    return {
      hasProgress: true,
      bodyPart: matchedPart,
      status: 'improving',
      patientFeedback: text.trim(),
      spokenReply: {
        english: `I am so glad to hear your ${info.name} pain is getting better, ${patient}! I have updated your Body Map with a green dot and recorded your recovery in your medical history. Please continue taking your tablets on time.`,
        telugu: `మీ ${info.teluguName} నొప్పి తగ్గుతున్నందుకు చాలా సంతోషం ${patient} గారు! బాడీ మ్యాప్‌లో గ్రీన్ డాట్ మార్క్ చేశాను మరియు మీ రికార్డుల్లో నమోదు చేశాను. మాత్రలు సమయానికి వేసుకోండి.`,
        hindi: `यह सुनकर बहुत अच्छा लगा कि आपके ${info.hindiName} के दर्द में सुधार हो रहा है, ${patient} जी! मैंने बॉडी मैप पर हरा निशान लगा दिया है और इसे रिकॉर्ड में दर्ज कर लिया है।`,
      },
    };
  }

  if (status === 'moderate') {
    return {
      hasProgress: true,
      bodyPart: matchedPart,
      status: 'moderate',
      patientFeedback: text.trim(),
      spokenReply: {
        english: `I understand, ${patient}. Your ${info.name} discomfort is marked with an orange indicator on your Body Map as moderate/heavy. Please rest quietly, avoid exertion, and keep hydrated.`,
        telugu: `మీ బాధను నేను విన్నాను ${patient} గారు. మీ ${info.teluguName} నొప్పి కాస్త ఎక్కువగా ఉన్నట్లుగా బాడీ మ్యాప్‌లో ఆరెంజ్ రంగులో గుర్తించాను. దయచేసి విశ్రాంతి తీసుకోండి.`,
        hindi: `मैंने आपकी बात नोट कर ली है, ${patient} जी। आपके ${info.hindiName} के दर्द को बॉडी मैप पर नारंगी निशान के साथ मध्यम/भारी दर्ज किया गया है। कृपया आराम करें।`,
      },
    };
  }

  return {
    hasProgress: true,
    bodyPart: matchedPart,
    status: 'active',
    patientFeedback: text.trim(),
    spokenReply: {
      english: `I hear you, ${patient}. Your ${info.name} discomfort is noted as active with a red alert dot on your Body Map. Please rest quietly, and I will alert your family if you need immediate care.`,
      telugu: `మీ బాధను నేను విన్నాను ${patient} గారు. మీ ${info.teluguName} నొప్పిని బాడీ మ్యాప్‌లో ఎరుపు రంగు గుర్తుతో ఉంచాను. దయచేసి విశ్రాంతి తీసుకోండి.`,
      hindi: `मैंने आपकी बात सुनी, ${patient} जी। आपके ${info.hindiName} के दर्द को बॉडी मैप पर लाल निशान के साथ सक्रिय रखा गया है। कृपया आराम करें।`,
    },
  };
}

// Synchronize health progress across Body Map, Patient Records, and AI Companion in real time
export function syncHealthProgress(
  bodyPart: BodyPartKey,
  status: PainStatus,
  patientQuote: string
): void {
  if (typeof window === 'undefined') return;

  const info = CLINICAL_PAIN_GUIDELINES[bodyPart];
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateStr = now.toISOString().split('T')[0];

  // 1. Update Body Map Observations
  let observations: Record<BodyPartKey, BodyPartObservation> = INITIAL_BODY_OBSERVATIONS;
  try {
    const saved = localStorage.getItem('aura_body_observations');
    if (saved) observations = JSON.parse(saved);
  } catch {}

  const current = observations[bodyPart] || INITIAL_BODY_OBSERVATIONS[bodyPart];
  const isPainActive = status === 'active' || status === 'moderate';
  const color =
    status === 'active'
      ? '#ef4444' // Red Dot
      : status === 'moderate'
      ? '#f97316' // Orange Dot
      : '#10b981'; // Green Dot / Clear

  let note = current.note;
  if (status === 'resolved') {
    note = `Pain completely resolved at ${timeStr}. Confirmed by patient: "${patientQuote}"`;
  } else if (status === 'improving') {
    note = `Symptom improving at ${timeStr}. Patient noted: "${patientQuote}"`;
  } else if (status === 'moderate') {
    note = `Moderate / heavy pain reported at ${timeStr}: "${patientQuote}"`;
  } else if (status === 'active') {
    note = `Active pain reported at ${timeStr}: "${patientQuote}"`;
  }

  observations[bodyPart] = {
    ...current,
    painStatus: status,
    isPainActive,
    color,
    note,
    reportedAt: now.toISOString(),
    lastPatientFeedback: patientQuote,
  };

  try {
    localStorage.setItem('aura_body_observations', JSON.stringify(observations));
    if (status === 'active' || status === 'moderate' || status === 'improving') {
      localStorage.setItem('aura_active_health_issue', bodyPart);
    }
  } catch {}

  // 2. Update Patient Medical Records (Append real-time Symptom Log)
  try {
    let records: any[] = [];
    const rSaved = localStorage.getItem('aura_patient_records');
    if (rSaved) records = JSON.parse(rSaved);

    const logTitle =
      status === 'resolved'
        ? `${info.name} Pain - Completely Resolved`
        : status === 'improving'
        ? `${info.name} Discomfort - Improving`
        : status === 'moderate'
        ? `${info.name} Pain - Moderate / Heavy`
        : `Active ${info.name} Pain Reported`;

    const logMetric =
      status === 'resolved'
        ? 'Pain 0/10 · Completely Resolved · No Dot'
        : status === 'improving'
        ? 'Improving Status · Green Dot'
        : status === 'moderate'
        ? 'Moderate / Heavy Pain · Orange Dot'
        : 'Active Pain · Red Alert Dot';

    const newLog = {
      type: 'SYMPTOM LOG',
      date: dateStr,
      by: 'Aura AI Voice Companion / Health Monitor',
      title: logTitle,
      desc: `Patient reported: "${patientQuote}". Symptom status updated to ${status.toUpperCase()} on Body Map.`,
      metric: logMetric,
      status: status === 'active' || status === 'moderate' ? 'Needs Attention' : 'Normal',
      statusOk: status !== 'active' && status !== 'moderate',
      icon: status === 'resolved' ? '⚪' : status === 'improving' ? '🟢' : status === 'moderate' ? '🟠' : '🔴',
      filterKey: 'Symptom Log',
      hasPain: status !== 'resolved',
      painLocation: bodyPart,
      painSeverity: status === 'active' ? 'severe' : status === 'moderate' ? 'moderate' : 'mild',
    };

    records = [newLog, ...records];
    localStorage.setItem('aura_patient_records', JSON.stringify(records));
  } catch {}

  // 3. Dispatch events to keep all views synchronized in real time
  window.dispatchEvent(
    new CustomEvent('aura_body_map_updated', {
      detail: {
        bodyPart,
        status,
        quote: patientQuote,
        label: info.name,
        observations,
        timestamp: Date.now(),
      },
    })
  );

  window.dispatchEvent(new CustomEvent('aura_records_updated'));
}

// Helper to get active health conditions that Siri should proactively check on
export function getActiveHealthConditions(): {
  bodyPart: BodyPartKey;
  name: string;
  teluguName: string;
  hindiName: string;
  status: PainStatus;
  condition?: string;
  tablets?: string[];
}[] {
  if (typeof window === 'undefined') return [];

  let obs: Record<BodyPartKey, BodyPartObservation> = INITIAL_BODY_OBSERVATIONS;
  try {
    const saved = localStorage.getItem('aura_body_observations');
    if (saved) obs = JSON.parse(saved);
  } catch {}

  const activeList: {
    bodyPart: BodyPartKey;
    name: string;
    teluguName: string;
    hindiName: string;
    status: PainStatus;
    condition?: string;
    tablets?: string[];
  }[] = [];

  for (const [key, val] of Object.entries(obs) as [BodyPartKey, BodyPartObservation][]) {
    const status = val.painStatus || (val.isPainActive ? 'active' : 'none');
    if (status === 'active' || status === 'improving') {
      const guide = CLINICAL_PAIN_GUIDELINES[key];
      activeList.push({
        bodyPart: key,
        name: guide.name,
        teluguName: guide.teluguName,
        hindiName: guide.hindiName,
        status,
        condition: val.condition || val.label,
        tablets: val.reliefTablets,
      });
    }
  }

  return activeList;
}

// Generates Siri's proactive check-in question for daily conversation
export function generateProactiveHealthQuestion(
  lang: 'en-US' | 'te-IN' | 'hi-IN' = 'en-US',
  userName = 'Rajamma'
): string | null {
  const activeConditions = getActiveHealthConditions();
  if (activeConditions.length === 0) return null;

  // Prioritize heart if present, otherwise the first active issue
  const priorityIssue =
    activeConditions.find((c) => c.bodyPart === 'heart') || activeConditions[0];

  const part = priorityIssue.bodyPart;
  const name = priorityIssue.name;
  const telugu = priorityIssue.teluguName;
  const hindi = priorityIssue.hindiName;

  if (lang === 'te-IN') {
    return `నమస్కారం ${userName} గారు! నేను మీ ఆరోగ్యాన్ని పర్యవేక్షిస్తున్నాను. మీ ${telugu} నొప్పి ఇప్పుడు ఎలా ఉంది? కాస్త నయమైందా?`;
  }
  if (lang === 'hi-IN') {
    return `नमस्ते ${userName} जी! आपके ${hindi} का दर्द अब कैसा है? क्या उसमें कुछ सुधार हुआ है?`;
  }
  return `Hello ${userName}! I am keeping an eye on your health. How is your ${name.toLowerCase()} pain now? Has it improved?`;
}
