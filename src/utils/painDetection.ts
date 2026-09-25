// Clinical pain detection and body map update utility
export type BodyPartKey = 'head' | 'shoulder' | 'heart' | 'back' | 'stomach' | 'knee' | 'feet';

export interface BodyPartObservation {
  label: string;
  note: string;
  color: string;
  rec: string;
  reportedAt?: string;
  isPainActive?: boolean;
}

export const INITIAL_BODY_OBSERVATIONS: Record<BodyPartKey, BodyPartObservation> = {
  head: {
    label: 'Head (Clear Mind)',
    note: 'Excellent mental clarity baseline',
    color: '#10b981',
    rec: 'Mental clarity is at an excellent baseline. Continue daily morning mindfulness and regular sleep schedule.',
  },
  shoulder: {
    label: 'Shoulder & Arms (Comfortable)',
    note: 'Good range of motion, no stiffness reported',
    color: '#10b981',
    rec: 'Joint flexibility is stable. Gentle arm raises during morning routine help maintain mobility.',
  },
  heart: {
    label: 'Heart & Chest (Stable)',
    note: 'Resting pulse 72 bpm, normal sinus rhythm',
    color: '#10b981',
    rec: 'Cardiac vitals are completely stable. Continue daily afternoon quiet rest and low-sodium nutrition.',
  },
  back: {
    label: 'Back & Spine (Aligned)',
    note: 'Posture stable with good lumbar support',
    color: '#10b981',
    rec: 'Maintain supportive sitting posture. Gentle pelvic tilts and short walks relieve lower spine pressure.',
  },
  stomach: {
    label: 'Stomach (Digestive Care)',
    note: 'Mild fullness after morning breakfast',
    color: '#f59e0b',
    rec: 'Hydrate with warm ginger or cumin water after meals. Avoid heavy or oily dinners.',
  },
  knee: {
    label: 'Knee & Legs (Observation)',
    note: 'Mild physical fatigue during morning walk',
    color: '#f59e0b',
    rec: 'Mild knee stiffness reported earlier. Recommended light range-of-motion stretching and warm compresses.',
  },
  feet: {
    label: 'Feet & Ankles (Healthy Circulation)',
    note: 'Normal peripheral temperature, no edema',
    color: '#10b981',
    rec: 'Circulation in lower extremities is healthy. Keep feet warm and wear non-skid supportive slippers.',
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

export function detectPainInText(text: string): {
  hasPain: boolean;
  bodyPart: BodyPartKey;
  bodyPartLabel: string;
  symptomSummary: string;
  rec: string;
  spokenReply: {
    english: string;
    telugu: string;
    hindi: string;
  };
} | null {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  // Words indicating pain, ache, stiffness, discomfort
  const painKeywords = [
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
    'నొప్పి',
    'నొప్పులు',
    'బాధ',
    'తీపు',
    'లాగుతుంది',
    'పట్టేసింది',
    'మంట',
    'दर्द',
    'तकलीफ',
    'पीड़ा',
    'दुख',
    'दुखना',
    'ऐंठन',
    'सूजन',
    'जकड़न',
  ];

  const hasPainKeyword = painKeywords.some((w) => lower.includes(w));

  // Body part mapping keywords
  const bodyPartKeywords: Record<BodyPartKey, string[]> = {
    head: [
      'head',
      'headache',
      'migraine',
      'temple',
      'forehead',
      'scalp',
      'dizzy',
      'dizziness',
      'తల',
      'తలనొప్పి',
      'కళ్ళు తిరగడం',
      'सिर',
      'सिरदर्द',
      'माथा',
      'चक्कर',
    ],
    shoulder: [
      'shoulder',
      'arm',
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
    heart: [
      'heart',
      'chest',
      'ribs',
      'breath',
      'breathing',
      'palpitation',
      'గుండె',
      'ఛాతీ',
      'రొమ్ము',
      'దడ',
      'శ్వాస',
      'छाती',
      'दिल',
      'सीने',
      'धड़कन',
      'सांस',
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
    stomach: [
      'stomach',
      'belly',
      'tummy',
      'abdomen',
      'gut',
      'gastric',
      'digest',
      'indigestion',
      'acid',
      'కడుపు',
      'పొట్ట',
      'అజీర్ణం',
      'गैस',
      'पेट',
      'उदर',
      'मरोड़',
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

  let matchedPart: BodyPartKey | null = null;

  for (const [part, keywords] of Object.entries(bodyPartKeywords) as [BodyPartKey, string[]][]) {
    if (keywords.some((k) => lower.includes(k))) {
      matchedPart = part;
      break;
    }
  }

  // If pain keyword is present but no specific body part was matched, check context or default to knee
  if (hasPainKeyword && !matchedPart) {
    if (lower.includes('walk') || lower.includes('stand') || lower.includes('step')) {
      matchedPart = 'knee';
    } else if (lower.includes('sit') || lower.includes('lie') || lower.includes('bend')) {
      matchedPart = 'back';
    } else {
      matchedPart = 'knee';
    }
  }

  // Also if someone says "my knee hurts" or "headache" (even without explicit separate word "pain")
  if (!hasPainKeyword && matchedPart) {
    if (
      lower.includes('headache') ||
      lower.includes('hurt') ||
      lower.includes('ache') ||
      lower.includes('stiff') ||
      lower.includes('నొప్పి') ||
      lower.includes('दर्द')
    ) {
      // It is a pain complaint
    } else {
      return null;
    }
  }

  if (!matchedPart) return null;

  const info = CLINICAL_PAIN_GUIDELINES[matchedPart];
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return {
    hasPain: true,
    bodyPart: matchedPart,
    bodyPartLabel: `${info.name} (Pain Reported)`,
    symptomSummary: `Reported ${info.name} pain at ${timeStr}: "${text.trim()}"`,
    rec: info.rec,
    spokenReply: {
      english: `I have updated your body map for ${info.name} pain, Rajamma. Please sit comfortably and rest. I have logged this for your care circle.`,
      telugu: `రాజమ్మ గారు, మీ ${info.teluguName} నొప్పిని బాడీ మ్యాప్‌లో నమోదు చేశాను. దయచేసి విశ్రాంతి తీసుకోండి.`,
      hindi: `राजम्मा जी, मैंने आपके बॉडी मैप में ${info.hindiName} के दर्द को अपडेट कर दिया है। कृपया आराम करें।`,
    },
  };
}
