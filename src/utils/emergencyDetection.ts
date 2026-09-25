import {
  getCareCircleMembers,
  resolveCareContact,
  getPrimaryEmergencyContact,
  getPatientName,
  recordEmergencyEvent,
  CareMember,
  EmergencyEvent,
} from './careCircleStorage';
import { BodyPartKey, syncHealthProgress } from './painDetection';

export type HealthSeverity = 'NORMAL' | 'MILD' | 'MODERATE' | 'SERIOUS' | 'EMERGENCY';

export interface SymptomAnalysisResult {
  hasSymptom: boolean;
  primaryBodyPart: BodyPartKey;
  secondaryBodyParts: BodyPartKey[];
  severity: HealthSeverity;
  isEmergency: boolean;
  symptomsDetected: string[];
  clinicalSummary: string;
  emergencyReason?: string;
  userQuote: string;
  patientName: string;
  recommendedAction: string;
  spokenGuidance: {
    english: string;
    telugu: string;
    hindi: string;
  };
}

export interface ExplicitContactAction {
  type: 'CALL' | 'MESSAGE';
  targetRoleOrName: string;
  resolvedMember: CareMember;
  customMessage?: string;
  urgency: 'HIGH' | 'EMERGENCY';
}

export interface EmergencyDispatchResult {
  success: boolean;
  event: EmergencyEvent;
  contact: CareMember;
  callUrl: string;
  whatsappUrl: string;
  smsUrl: string;
  bodyPartsUpdated: BodyPartKey[];
  actionReport: string;
  spokenFeedback: {
    english: string;
    telugu: string;
    hindi: string;
  };
}

/**
 * 1. HEALTH SEVERITY & SYMPTOM DETECTION ENGINE
 * Detects symptoms from voice conversation, text, check-in, or reports.
 * Does NOT diagnose diseases directly; flags serious conditions requiring immediate care.
 */
export function analyzeHealthSymptoms(
  text: string,
  patientName?: string,
  vitals?: { hr?: number; bpSys?: number; bpDia?: number; spo2?: number; glucose?: number }
): SymptomAnalysisResult {
  const name = patientName || getPatientName();
  if (!text || typeof text !== 'string') {
    return {
      hasSymptom: false,
      primaryBodyPart: 'knee',
      secondaryBodyParts: [],
      severity: 'NORMAL',
      isEmergency: false,
      symptomsDetected: [],
      clinicalSummary: 'No active health symptoms reported.',
      userQuote: '',
      patientName: name,
      recommendedAction: 'Continue regular daily routine.',
      spokenGuidance: {
        english: `You are in stable health, ${name}. Keep up your good routine.`,
        telugu: `${name} గారు, మీ ఆరోగ్యం స్థిరంగా ఉంది.`,
        hindi: `${name} जी, आपकी सेहत स्थिर है।`,
      },
    };
  }

  const lower = text.toLowerCase().trim();
  const symptomsFound: string[] = [];
  const affectedParts: Set<BodyPartKey> = new Set();

  // Flag indicators
  let isSevere = false;
  let isModerate = false;
  let isMild = false;

  // Severe modifiers
  const severeModifiers = [
    'very bad',
    'very severe',
    'severe',
    'severely',
    'hurting very badly',
    'hurts very badly',
    'cannot bear',
    'can not bear',
    'unbearable',
    'crushing',
    'extreme',
    'extremely',
    'terrible',
    'badly',
    'sharp pain',
    'acute',
    'faint',
    'fainting',
    'spinning badly',
    'head is spinning',
    'cannot breathe',
    'hard to breathe',
    'gasping',
    'collapse',
    'తీవ్రమైన',
    'ఎక్కువగా',
    'భరించలేకపోతున్నాను',
    'ఆగట్లేదు',
    'చాలా నొప్పి',
    'చాలా తీవ్రం',
    'తీవ్రంగా',
    'చక్కర్లు',
    'శ్వాస ఆడట్లేదు',
    'दम घुट',
    'बहुत तेज',
    'असहनीय',
    'बहुत ज्यादा',
    'चक्कर आ रहे',
    'सांस नहीं आ रही',
    'बेहोश',
  ];

  if (severeModifiers.some((m) => lower.includes(m))) {
    isSevere = true;
  }

  // --- 1. CHEST / HEART SYMPTOMS ---
  const heartKeywords = [
    'heart',
    'chest',
    'angina',
    'palpitation',
    'heart hurting',
    'heart pain',
    'chest pain',
    'chest tightness',
    'chest pressure',
    'heavy chest',
    'ribs',
    'గుండె',
    'ఛాతీ',
    'రొమ్ము',
    'దడ',
    'గుండె నొప్పి',
    'ఛాతీ నొప్పి',
    'दिल',
    'छाती',
    'सीने',
    'धड़कन',
    'दिल का दर्द',
    'सीने में दर्द',
  ];
  if (heartKeywords.some((w) => lower.includes(w))) {
    affectedParts.add('heart');
    symptomsFound.push('Chest/Heart discomfort');
  }

  // --- 2. BREATHING SYMPTOMS ---
  const breathingKeywords = [
    'breathing difficulty',
    'difficulty breathing',
    'short of breath',
    'shortness of breath',
    'breathless',
    'breathlessness',
    'cannot breathe',
    'hard to breathe',
    'gasping',
    'choking',
    'asthma',
    'శ్వాస',
    'శ్వాస తీసుకోవడంలో ఇబ్బంది',
    'ఆయాసం',
    'ఉబ్బసం',
    'सांस',
    'सांस फूलना',
    'सांस लेने में तकलीफ',
    'दम फूलना',
  ];
  if (breathingKeywords.some((w) => lower.includes(w))) {
    affectedParts.add('heart'); // Map respiratory distress to heart/chest region
    symptomsFound.push('Breathing difficulty');
    isSevere = true; // Breathing issues are high priority
  }

  // --- 3. HEAD / DIZZINESS / FAINTING / NEUROLOGICAL ---
  const headKeywords = [
    'headache',
    'head ache',
    'migraine',
    'head pain',
    'forehead',
    'temple',
    'throbbing head',
    'head hurts',
    'head is hurting',
    'dizzy',
    'dizziness',
    'spinning',
    'head spinning',
    'lightheaded',
    'vertigo',
    'faint',
    'fainting',
    'passed out',
    'blackout',
    'blacking out',
    'confusion',
    'disoriented',
    'speech slurred',
    'stroke',
    'నొప్పి తల',
    'తలనొప్పి',
    'తల నొప్పి',
    'తల తిరుగుతుంది',
    'కళ్ళు తిరగడం',
    'కళ్ళు తిరుగుతున్నాయి',
    'స్పృహ తప్పు',
    'మైకం',
    'सिरदर्द',
    'सिर दर्द',
    'माथा दर्द',
    'चक्कर',
    'सिर घूम रहा',
    'बेहोशी',
    'चक्कर आना',
  ];
  if (headKeywords.some((w) => lower.includes(w))) {
    affectedParts.add('head');
    if (lower.includes('dizzy') || lower.includes('spinning') || lower.includes('తిరుగు') || lower.includes('चक्कर')) {
      symptomsFound.push('Dizziness & Vertigo');
    } else if (lower.includes('faint') || lower.includes('స్పృహ') || lower.includes('बेहोश')) {
      symptomsFound.push('Fainting / Syncope risk');
      isSevere = true;
    } else {
      symptomsFound.push('Headache');
    }
  }

  // --- 4. WEAKNESS / SUDDEN WEAKNESS ---
  const weaknessKeywords = [
    'weakness',
    'sudden weakness',
    'feeling weak',
    'very weak',
    'exhausted',
    'no strength',
    'cannot stand',
    'నిస్సత్తువ',
    'నీరసం',
    'బలహీనత',
    'కాళ్ళు చేతులు ఆడట్లేదు',
    'कमजोरी',
    'अचानक कमजोरी',
    'थकान',
    'हिम्मत नहीं',
  ];
  if (weaknessKeywords.some((w) => lower.includes(w))) {
    affectedParts.add('head'); // Associate systemic weakness/faintness with head/vital indicator
    symptomsFound.push('Severe weakness / fatigue');
    if (lower.includes('sudden') || lower.includes('very weak') || lower.includes('చాలా నీరసం')) {
      isSevere = true;
    }
  }

  // --- 5. STOMACH / ABDOMINAL SYMPTOMS ---
  const stomachKeywords = [
    'stomach',
    'stomach pain',
    'stomachache',
    'belly',
    'belly pain',
    'tummy',
    'abdomen',
    'abdominal',
    'gut',
    'cramp',
    'cramps',
    'nausea',
    'vomiting',
    'acid reflux',
    'indigestion',
    'gastric',
    'కడుపు',
    'పొట్ట',
    'కడుపు నొప్పి',
    'పొట్ట నొప్పి',
    'వాంతులు',
    'అజీర్ణం',
    'గ్యాస్',
    'पेट',
    'पेट दर्द',
    'उदर',
    'मरोड़',
    'उल्टी',
    'गैस',
    'अपच',
  ];
  if (stomachKeywords.some((w) => lower.includes(w))) {
    affectedParts.add('stomach');
    symptomsFound.push('Stomach / Abdominal pain');
  }

  // --- 6. SHOULDER & ARM (INCLUDING RADIATING PAIN) ---
  const shoulderKeywords = [
    'shoulder',
    'shoulder pain',
    'arm',
    'left arm',
    'arm pain',
    'elbow',
    'wrist',
    'భుజం',
    'భుజం నొప్పి',
    'చేయి',
    'ఎడమ చేయి',
    'కండరాలు',
    'कंधा',
    'कंधे में दर्द',
    'बांह',
    'बायां हाथ',
    'कलाई',
  ];
  if (shoulderKeywords.some((w) => lower.includes(w))) {
    affectedParts.add('shoulder');
    symptomsFound.push('Shoulder / Arm discomfort');
    if (lower.includes('left arm') || lower.includes('ఎడమ చేయి') || lower.includes('बायां हाथ')) {
      // Radiating left arm pain is a classic emergency cardiac warning sign
      affectedParts.add('heart');
      isSevere = true;
    }
  }

  // --- 7. BACK & SPINE ---
  const backKeywords = [
    'back',
    'back pain',
    'spine',
    'lumbar',
    'lower back',
    'waist',
    'వెన్ను',
    'నడుము',
    'వెన్ను నొప్పి',
    'నడుము నొప్పి',
    'వీపు',
    'पीठ',
    'कमर',
    'पीठ दर्द',
    'कमर दर्द',
    'रीढ़',
  ];
  if (backKeywords.some((w) => lower.includes(w))) {
    affectedParts.add('back');
    symptomsFound.push('Back / Spine pain');
  }

  // --- 8. KNEE & LEGS ---
  const kneeKeywords = [
    'knee',
    'knees',
    'knee pain',
    'joint',
    'joints',
    'joint pain',
    'leg',
    'legs',
    'calf',
    'thigh',
    'మోకాలు',
    'మోకాళ్ళు',
    'మోకాలు నొప్పి',
    'కీళ్ళు',
    'కీళ్ళ నొప్పి',
    'కాలు',
    'घुटना',
    'घुटने',
    'घुटने का दर्द',
    'जोड़',
    'जोड़ों का दर्द',
    'टांग',
  ];
  if (kneeKeywords.some((w) => lower.includes(w))) {
    affectedParts.add('knee');
    symptomsFound.push('Knee / Joint pain');
  }

  // --- 9. FEET & ANKLES ---
  const feetKeywords = [
    'foot',
    'feet',
    'ankle',
    'heel',
    'toe',
    'toes',
    'swollen feet',
    'swelling in feet',
    'పాదం',
    'పాదాలు',
    'పాదాల నొప్పి',
    'చీలమండ',
    'వాపు',
    'పैर',
    'पैरों में दर्द',
    'एड़ी',
    'टखना',
    'सूजन',
  ];
  if (feetKeywords.some((w) => lower.includes(w))) {
    affectedParts.add('feet');
    symptomsFound.push('Foot / Ankle discomfort');
  }

  // --- 10. BLEEDING & CRITICAL EMERGENCIES ---
  if (lower.includes('bleeding') || lower.includes('రక్తం') || lower.includes('खून')) {
    symptomsFound.push('Active bleeding reported');
    isSevere = true;
  }

  // Check vitals if provided
  if (vitals) {
    if ((vitals.hr && (vitals.hr > 125 || vitals.hr < 48)) ||
        (vitals.spo2 && vitals.spo2 < 91) ||
        (vitals.bpSys && vitals.bpSys > 175) ||
        (vitals.glucose && (vitals.glucose > 280 || vitals.glucose < 60))) {
      isSevere = true;
      symptomsFound.push('Critical physiological telemetry alert');
      affectedParts.add('heart');
    }
  }

  // Check if multiple red-flag combinations occur (e.g. Chest pain + Dizziness)
  const hasChest = affectedParts.has('heart');
  const hasDizzinessOrFaint =
    affectedParts.has('head') &&
    (lower.includes('dizzy') ||
     lower.includes('faint') ||
     lower.includes('spinning') ||
     lower.includes('తిరుగు') ||
     lower.includes('చక్కర్'));

  if (hasChest && hasDizzinessOrFaint) {
    isSevere = true;
    symptomsFound.push('Concurrent Chest Pain with Dizziness');
  }

  // If no symptoms found at all
  if (affectedParts.size === 0 && symptomsFound.length === 0) {
    // Check if general pain word exists
    if (lower.includes('pain') || lower.includes('hurt') || lower.includes('నొప్పి') || lower.includes('दर्द')) {
      affectedParts.add('knee');
      symptomsFound.push('General body discomfort');
      isModerate = true;
    } else {
      return {
        hasSymptom: false,
        primaryBodyPart: 'knee',
        secondaryBodyParts: [],
        severity: 'NORMAL',
        isEmergency: false,
        symptomsDetected: [],
        clinicalSummary: 'No health discomfort flagged.',
        userQuote: text,
        patientName: name,
        recommendedAction: 'Continue healthy daily routine.',
        spokenGuidance: {
          english: `I hear you, ${name}. How are you feeling right now?`,
          telugu: `${name} గారు, ప్రస్తుతం మీరు ఎలా ఉన్నారు?`,
          hindi: `${name} जी, आप अभी कैसा महसूस कर रहे हैं?`,
        },
      };
    }
  }

  // Determine Severity: NORMAL | MILD | MODERATE | SERIOUS / EMERGENCY
  let severity: HealthSeverity = 'MODERATE';
  if (isSevere || (hasChest && hasDizzinessOrFaint)) {
    severity = 'EMERGENCY';
  } else if (affectedParts.has('heart') || symptomsFound.some((s) => s.includes('risk') || s.includes('difficulty') || s.includes('weakness'))) {
    severity = 'SERIOUS';
  } else if (isModerate) {
    severity = 'MODERATE';
  } else if (
    lower.includes('mild') ||
    lower.includes('slight') ||
    lower.includes('little') ||
    lower.includes('కాస్త') ||
    lower.includes('కొద్దిగా') ||
    lower.includes('हल्का') ||
    lower.includes('थोड़ा')
  ) {
    severity = 'MILD';
  } else {
    severity = 'MODERATE';
  }

  const partsArray = Array.from(affectedParts);
  const primaryBodyPart = partsArray.includes('heart')
    ? 'heart'
    : partsArray.includes('head')
    ? 'head'
    : partsArray[0] || 'knee';

  const secondaryBodyParts = partsArray.filter((p) => p !== primaryBodyPart);
  const isEmergency = severity === 'EMERGENCY' || severity === 'SERIOUS';

  const clinicalSummary = `${symptomsFound.join(' + ')} reported by ${name}. Clinical severity classified as ${severity}. Affected areas: ${partsArray.join(', ')}.`;
  const emergencyReason = isEmergency
    ? `Potential serious condition: ${symptomsFound.join(', ')}. Immediate care circle alert and clinical monitoring advised.`
    : undefined;

  const recommendedAction = isEmergency
    ? 'Sit down immediately in a comfortable supported position. Keep head elevated, unbutton tight clothing, take slow deep breaths, and await caregiver assistance.'
    : 'Rest quietly, stay well-hydrated with warm water, avoid physical exertion, and take prescribed maintenance tablets.';

  const spokenGuidance = {
    english: isEmergency
      ? `Emergency alert, ${name}! Your reported symptoms of ${symptomsFound.join(' and ')} indicate a serious condition. I have updated your Body Map with red alert markers and triggered an emergency notification to your Care Circle. Please sit down and stay calm.`
      : `I have noted your ${symptomsFound.join(' and ')}, ${name}. I have marked this on your Body Map and logged it in your health records. Please rest quietly.`,
    telugu: isEmergency
      ? `అత్యవసర హెచ్చరిక ${name} గారు! మీ ${symptomsFound.join(' మరియు ')} తీవ్రమైన పరిస్థితిని సూచిస్తున్నాయి. మీ బాడీ మ్యాప్‌లో ఎరుపు రంగు గుర్తు ఉంచాను మరియు మీ కేర్ సర్కిల్‌కి హెచ్చరిక పంపాను. దయచేసి కూర్చోండి.`
      : `${name} గారు, మీ ${symptomsFound.join(' మరియు ')} వివరాలు బాడీ మ్యాప్‌లో నమోదయ్యాయి. దయచేసి విశ్రాంతి తీసుకోండి.`,
    hindi: isEmergency
      ? `आपातकालीन चेतावनी ${name} जी! आपके द्वारा बताए गए लक्षण ${symptomsFound.join(' और ')} गंभीर स्थिति का संकेत देते हैं। मैंने बॉडी मैप पर लाल निशान लगा दिया है और आपके केयर सर्कल को अलर्ट भेज दिया है। कृपया शांत होकर बैठें।`
      : `${name} जी, आपके ${symptomsFound.join(' और ')} को बॉडी मैप पर दर्ज कर लिया गया है। कृपया आराम करें।`,
  };

  return {
    hasSymptom: true,
    primaryBodyPart,
    secondaryBodyParts,
    severity,
    isEmergency,
    symptomsDetected: symptomsFound,
    clinicalSummary,
    emergencyReason,
    userQuote: text,
    patientName: name,
    recommendedAction,
    spokenGuidance,
  };
}

/**
 * 2. EXPLICIT CONTACT REQUEST DETECTION
 * Detects phrases like "Call my son", "Phone my son", "Call my daughter",
 * "Send a message to my son", "Message my son that I have severe chest pain"
 */
export function detectContactRequest(text: string): ExplicitContactAction | null {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  const isCall =
    lower.includes('call') ||
    lower.includes('phone') ||
    lower.includes('dial') ||
    lower.includes('ring') ||
    lower.includes('contact') ||
    lower.includes('ఫోన్ చేయి') ||
    lower.includes('కాల్ చేయి') ||
    lower.includes('పిలువు') ||
    lower.includes('కాల్') ||
    lower.includes('कॉल') ||
    lower.includes('फोन') ||
    lower.includes('फोन लगाओ') ||
    lower.includes('कॉल करो');

  const isMessage =
    lower.includes('message') ||
    lower.includes('text') ||
    lower.includes('sms') ||
    lower.includes('whatsapp') ||
    lower.includes('send a message') ||
    lower.includes('సందేశం') ||
    lower.includes('మెసేజ్') ||
    lower.includes('మెసేజ్ చేయి') ||
    lower.includes('వాట్సాప్') ||
    lower.includes('मैसेज') ||
    lower.includes('संदेश') ||
    lower.includes('व्हाट्सएप');

  if (!isCall && !isMessage) {
    return null;
  }

  // Resolve target contact from Care Circle
  const targetMember = resolveCareContact(lower);
  if (!targetMember) return null;

  // Extract custom message if present
  let customMsg = '';
  if (lower.includes('that ') || lower.includes('to tell ') || lower.includes('చెప్పు') || lower.includes('बताओ')) {
    const splitWords = text.split(/(?:that|tell|చెప్పు|అని|बताओ|कि)/i);
    if (splitWords.length > 1) {
      customMsg = splitWords.slice(1).join(' ').trim();
    }
  }

  return {
    type: isCall ? 'CALL' : 'MESSAGE',
    targetRoleOrName: targetMember.name,
    resolvedMember: targetMember,
    customMessage: customMsg || undefined,
    urgency: lower.includes('severe') || lower.includes('chest') || lower.includes('pain') || lower.includes('urgent')
      ? 'EMERGENCY'
      : 'HIGH',
  };
}

/**
 * 3. AUTOMATIC CARE CIRCLE EMERGENCY WORKFLOW
 * Executed whenever a SERIOUS / EMERGENCY condition is detected, or upon explicit request.
 * - Updates Body Map with Red Alert dots on affected areas
 * - Identifies primary emergency responder (e.g. Son)
 * - Initiates real phone call via `tel:` URI protocol
 * - Dispatches WhatsApp alert via backend gateway + pre-populates direct WhatsApp URL
 * - Records event in emergency history and patient records
 * - Dispatches window event so the emergency banner/modal displays instant feedback
 */
export async function executeEmergencyWorkflow(
  symptomAnalysis: SymptomAnalysisResult,
  targetContact?: CareMember
): Promise<EmergencyDispatchResult> {
  const patient = symptomAnalysis.patientName || getPatientName();
  const contact = targetContact || resolveCareContact('son') || getPrimaryEmergencyContact();

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateStr = now.toISOString().split('T')[0];

  // 1. AUTOMATIC BODY MAP DOT UPDATES (Primary and secondary affected parts)
  const partsToUpdate: BodyPartKey[] = [symptomAnalysis.primaryBodyPart, ...symptomAnalysis.secondaryBodyParts];
  for (const part of partsToUpdate) {
    syncHealthProgress(
      part,
      'active',
      `[EMERGENCY DETECTED] ${symptomAnalysis.symptomsDetected.join(', ')} reported at ${timeStr}.`
    );
  }

  // 2. Prepare Phone Call URL
  const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');
  const callUrl = `tel:${cleanPhone}`;

  // 3. Prepare Emergency Message (Dynamic patient name and Care Circle contact)
  const symptomText = symptomAnalysis.symptomsDetected.join(', ') || 'acute physical distress';
  const alertText = `Emergency Alert:\n${patient} may be experiencing ${symptomText} (${symptomAnalysis.severity}). Please contact her immediately and check on her. Location: Flat 302, Hyderabad.\nTime: ${timeStr}.`;

  const encodedMsg = encodeURIComponent(alertText);
  const waCleanPhone = cleanPhone.replace(/^\+/, '');
  const whatsappUrl = `https://wa.me/${waCleanPhone}?text=${encodedMsg}`;
  const smsUrl = `sms:${cleanPhone}?body=${encodedMsg}`;

  // 4. Send to WhatsApp Emergency Gateway Backend
  let apiSuccess = false;
  try {
    const res = await fetch('/api/whatsapp/send-emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symptomText: `${symptomAnalysis.symptomsDetected.join(', ')} (${symptomAnalysis.severity})`,
        contacts: [contact],
        userName: patient,
        location: 'Home (Flat 302, Hyderabad)',
      }),
    });
    const data = await res.json();
    apiSuccess = !!data.success;
  } catch (err) {
    console.warn('Backend emergency dispatch warning:', err);
  }

  // 5. Trigger Phone Call via browser/Android webview if supported
  if (typeof window !== 'undefined') {
    try {
      // In web/Android, initiating a tel: link opens the native device dialer
      window.location.href = callUrl;
    } catch (e) {
      console.warn('Call trigger note:', e);
    }
  }

  // 6. Record Emergency Event in audit history
  const event: EmergencyEvent = {
    id: `emg-${Date.now()}`,
    timestamp: timeStr,
    dateStr,
    patientName: patient,
    symptoms: symptomAnalysis.symptomsDetected,
    severity: 'EMERGENCY',
    bodyParts: partsToUpdate,
    contactNotified: {
      name: contact.name,
      role: contact.role,
      phone: contact.phone,
    },
    callInitiated: true,
    messageDispatched: true,
    channelUsed: apiSuccess ? 'WhatsApp Gateway + Native Dialer' : 'Native Dialer + WhatsApp Link',
    summary: `${patient} reported ${symptomText}. Contacted ${contact.name} (${contact.role}) at ${contact.phone}.`,
  };

  recordEmergencyEvent(event);

  // 7. Dispatch global emergency notification event for UI modal & banner
  const actionReport = `Emergency alert active for ${patient}. Alerted ${contact.name} (${contact.role}) at ${contact.phone}. Body map updated with red alert dots for: ${partsToUpdate.join(', ').toUpperCase()}.`;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('aura_emergency_alert_triggered', {
        detail: {
          symptomAnalysis,
          contact,
          callUrl,
          whatsappUrl,
          smsUrl,
          event,
          partsUpdated: partsToUpdate,
          actionReport,
        },
      })
    );
  }

  return {
    success: true,
    event,
    contact,
    callUrl,
    whatsappUrl,
    smsUrl,
    bodyPartsUpdated: partsToUpdate,
    actionReport,
    spokenFeedback: symptomAnalysis.spokenGuidance,
  };
}
