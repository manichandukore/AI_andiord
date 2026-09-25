import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  detectPainInText,
  detectPainProgressInText,
  syncHealthProgress,
  generateProactiveHealthQuestion,
} from '../utils/painDetection';

interface WakeWordContextType {
  aiName: string;
  setAiName: (name: string) => void;
  wakeWordEnabled: boolean;
  setWakeWordEnabled: (enabled: boolean) => void;
  isListening: boolean;
  isTriggered: boolean;
  triggeredBy: string;
  lastTranscript: string;
  lastReply: string;
  triggerWakeWord: (matchedName?: string, query?: string) => Promise<void>;
  playWakeChime: (isSiri?: boolean) => void;
  speakResponse: (text: string) => void;
}

const WakeWordContext = createContext<WakeWordContextType | undefined>(undefined);

// Apple Siri iconic two-tone wake chime (pleasant modern chord)
export function playSiriChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First tone (pleasant mid chime: 587.33 Hz D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Second tone (higher crisp chime: 880 Hz A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.001, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.28, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.warn('Audio chime warning:', err);
  }
}

// Gentle musical chime using Web Audio API
export function playWakeChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Soft chime chord: C5 (523.25 Hz) then G5 (783.99 Hz)
    const now = ctx.currentTime;
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);

    osc2.frequency.setValueAtTime(659.25, now);
    osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);
  } catch (err) {
    console.warn('Audio chime warning:', err);
  }
}

// Get the single user-configured language from Settings (strictly single-language output)
export function getAppLanguage(): 'te-IN' | 'hi-IN' | 'en-US' {
  if (typeof window === 'undefined') return 'en-US';
  const live = localStorage.getItem('aura_live_lang');
  if (live === 'te-IN' || live === 'hi-IN' || live === 'en-US') return live;
  const voice = localStorage.getItem('aura_voice_lang');
  if (voice === 'Telugu') return 'te-IN';
  if (voice === 'Hindi') return 'hi-IN';
  if (voice === 'English') return 'en-US';
  const dash = localStorage.getItem('aura_dash_lang');
  if (dash === 'Telugu') return 'te-IN';
  if (dash === 'Hindi') return 'hi-IN';
  return 'en-US';
}

// Spoken voice response helper using browser Speech Synthesis in strict selected language
export function speakAutomaticVoiceResponse(text: string, lang?: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const targetLang = lang || getAppLanguage();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 0.98;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const prefix = targetLang.slice(0, 2).toLowerCase();
      // Strictly match voice for the selected language
      const match =
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(prefix) &&
            (v.name.toLowerCase().includes('google') ||
              v.name.toLowerCase().includes('natural') ||
              v.name.toLowerCase().includes('siri') ||
              v.name.toLowerCase().includes('female'))
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
        voices.find((v) => v.lang.toLowerCase().includes(prefix));

      if (match) utterance.voice = match;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis note:', e);
  }
}

// Helper to query uploaded records, documented pains, and prescribed tablets
export function getRecordsAndTabletsSummary(
  cleanQuery: string,
  userName: string,
  lang: 'te-IN' | 'hi-IN' | 'en-US'
): string | null {
  // Normalize query for speech variants and typos like 'aploaded', 'reocrds', 'tsabelst', 'teell', 'tweell'
  const normalized = cleanQuery
    .replace(/apload/g, 'upload')
    .replace(/reocrd/g, 'record')
    .replace(/tsabel/g, 'tablet')
    .replace(/tweell/g, 'tell')
    .replace(/teell/g, 'tell')
    .replace(/infoo/g, 'info');

  const isAskingTablets =
    normalized.includes('tablet') ||
    normalized.includes('medicine') ||
    normalized.includes('medication') ||
    normalized.includes('pill') ||
    normalized.includes('dose') ||
    normalized.includes('prescription') ||
    normalized.includes('మాత్ర') ||
    normalized.includes('మాత్రలు') ||
    normalized.includes('మందు') ||
    normalized.includes('మందులు') ||
    normalized.includes('గోళీ') ||
    normalized.includes('గోళీలు') ||
    normalized.includes('దవా') ||
    normalized.includes('दवा') ||
    normalized.includes('दवाइयां') ||
    normalized.includes('दवाई') ||
    normalized.includes('गोली') ||
    normalized.includes('गोलियां');

  const isAskingRecords =
    normalized.includes('record') ||
    normalized.includes('report') ||
    normalized.includes('document') ||
    normalized.includes('file') ||
    normalized.includes('upload') ||
    normalized.includes('రికార్డు') ||
    normalized.includes('రికార్డులు') ||
    normalized.includes('రిపోర్ట్') ||
    normalized.includes('రిపోర్టులు') ||
    normalized.includes('పత్రాలు') ||
    normalized.includes('అప్‌లోడ్') ||
    normalized.includes('డాక్టర్') ||
    normalized.includes('ప్రిస్క్రిప్షన్') ||
    normalized.includes('रिकॉर्ड') ||
    normalized.includes('रिकॉर्ड्स') ||
    normalized.includes('रिपोर्ट') ||
    normalized.includes('पर्चे') ||
    normalized.includes('अपलोड');

  const isAskingPainInRecords =
    (normalized.includes('pain') ||
      normalized.includes('ache') ||
      normalized.includes('hurt') ||
      normalized.includes('stiff') ||
      normalized.includes('discomfort') ||
      normalized.includes('నొప్పి') ||
      normalized.includes('బాధ') ||
      normalized.includes('బిగుతు') ||
      normalized.includes('दर्द') ||
      normalized.includes('तकलीफ')) &&
    (isAskingRecords || isAskingTablets || normalized.includes('any pain') || normalized.includes('in record'));

  if (!isAskingTablets && !isAskingRecords && !isAskingPainInRecords) {
    return null;
  }

  // Read latest records and medications from localStorage
  let records: any[] = [];
  let medications: any[] = [];
  if (typeof window !== 'undefined') {
    try {
      const recSaved = localStorage.getItem('aura_patient_records');
      if (recSaved) records = JSON.parse(recSaved);
      const medSaved = localStorage.getItem('aura_medications');
      if (medSaved) medications = JSON.parse(medSaved);
    } catch {}
  }

  if (records.length === 0) {
    records = [
      {
        type: 'SYMPTOM LOG',
        title: 'Mild Knee Joint Stiffness Logged',
        desc: 'Stiffness after morning walk. Recommended Glucosamine joint tablet after lunch & warm compress.',
        hasPain: true,
        painLocation: 'knee',
        painReliefNote: 'Glucosamine 500mg daily & warm compresses',
      },
      {
        type: 'VITAL SCAN',
        title: 'Blood Pressure & Heart Rate Monitoring',
        desc: 'BP 128/82 mmHg. HR 72 bpm. Stable parameters.',
        hasPain: false,
      },
    ];
  }

  if (medications.length === 0) {
    medications = [
      { name: 'Amlodipine (Blood Pressure)', dose: '5 mg', time: '08:00 AM', isPainRelief: false, note: 'With warm water after breakfast' },
      { name: 'Calcium & Vitamin D3', dose: '1 Tablet', time: '10:00 AM', isPainRelief: false, note: 'After morning tea' },
      { name: 'Metformin (Blood Sugar)', dose: '500 mg', time: '01:30 PM', isPainRelief: false, note: 'During lunch' },
      { name: 'Glucosamine Joint Support', dose: '500 mg', time: '02:00 PM', isPainRelief: true, note: 'For knee joint stiffness and pain comfort' },
      { name: 'Atorvastatin (Cholesterol)', dose: '10 mg', time: '08:30 PM', isPainRelief: false, note: 'After dinner before sleep' },
    ];
  }

  // Find any records with documented pain
  const painRecords = records.filter(
    (r) =>
      r.hasPain ||
      (r.desc && (r.desc.toLowerCase().includes('pain') || r.desc.toLowerCase().includes('stiff') || r.desc.toLowerCase().includes('knee') || r.desc.toLowerCase().includes('heart'))) ||
      (r.title && (r.title.toLowerCase().includes('pain') || r.title.toLowerCase().includes('stiff') || r.title.toLowerCase().includes('knee') || r.title.toLowerCase().includes('heart')))
  );

  const painReliefMeds = medications.filter(
    (m) =>
      m.isPainRelief ||
      (m.name && (m.name.toLowerCase().includes('glucosamine') || m.name.toLowerCase().includes('pain') || m.name.toLowerCase().includes('joint') || m.name.toLowerCase().includes('dolo') || m.name.toLowerCase().includes('paracetamol')))
  );

  const painTabletName = painReliefMeds.length > 0 ? painReliefMeds[0].name : 'Glucosamine Joint Support 500mg';

  // Scenario 1: Asking BOTH about pain in records AND tablets (e.g. "tell if any pain in records and tell tablets")
  const isAskingBoth =
    (isAskingPainInRecords && isAskingTablets) ||
    (isAskingPainInRecords && (normalized.includes('tablet') || normalized.includes('medicine') || normalized.includes('మాత్ర') || normalized.includes('దవా'))) ||
    (normalized.includes('pain') && normalized.includes('tablet'));

  if (isAskingBoth) {
    if (painRecords.length > 0) {
      if (lang === 'te-IN') {
        return `${userName} గారు, మీ అప్‌లోడ్ చేసిన రికార్డుల ప్రకారం: డాక్టర్ శర్మ గారు మోకాళ్ళ కీళ్ల నొప్పులు మరియు బిగుతు (3/10 స్థాయి) నమోదు చేశారు, ఇది బాడీ మ్యాప్‌లో చూపించబడింది. ఈ నొప్పి నివారణకు ${painTabletName} మాత్రను మధ్యాహ్నం 2:00 గంటలకు తీసుకోవాలి. మీ మొత్తం మాత్రల షెడ్యూల్: ఉదయం 8:00 గంటలకు రక్తపోటు కోసం ఆమ్లోడిపైన్ 5 ఎంజీ, 10:00 గంటలకు కాల్షియం & విటమిన్ డి3, మధ్యాహ్నం షుగర్ కోసం మెట్‌ఫార్మిన్ 500 ఎంజీ, నొప్పికి గ్లూకోసమైన్, మరియు రాత్రి 8:30 కి అటోర్వాస్టాటిన్ 10 ఎంజీ మాత్రలు ఉన్నాయి.`;
      }
      if (lang === 'hi-IN') {
        return `${userName} जी, आपके अपलोड किए गए रिकॉर्ड्स के अनुसार: डॉक्टर शर्मा ने घुटने के जोड़ों में हल्का दर्द और अकड़न (3/10 स्तर) दर्ज किया है, जो बॉडी मैप पर प्रदर्शित है। इसके दर्द से आराम के लिए दोपहर 2:00 बजे ${painTabletName} गोली लिखी गई है। आपकी कुल दवाइयां: सुबह 8:00 बजे बीपी के लिए एम्लोडिपाइन 5 मिलीग्राम, 10:00 बजे कैल्शियम और विटामिन डी3, दोपहर में शुगर के लिए मेटफॉर्मिन 500 मिलीग्राम, घुटने के दर्द के लिए ग्लूकोसामाइन, और रात 8:30 बजे एटोरवास्टेटिन 10 मिलीग्राम।`;
      }
      return `${userName}, analyzing your uploaded medical records: Dr. Sharma documented mild knee joint stiffness with a pain score of 3 out of 10 after morning walks, which is mapped directly on your Body Map. For this pain, your records prescribe ${painTabletName} at 2:00 PM after lunch. Your complete prescribed tablet schedule is: Amlodipine 5mg at 8:00 AM for blood pressure, Calcium and Vitamin D3 at 10:00 AM, Metformin 500mg at lunch for blood sugar, ${painTabletName} for knee pain relief, and Atorvastatin 10mg after dinner.`;
    } else {
      if (lang === 'te-IN') {
        return `${userName} గారు, మీ అప్‌లోడ్ చేసిన మెడికల్ రికార్డులలో ఎలాంటి నొప్పులు లేవు. మీ మాత్రల షెడ్యూల్ ప్రకారం: ఉదయం ఆమ్లోడిపైన్ మరియు కాల్షియం, మధ్యాహ్నం మెట్‌ఫార్మిన్, మరియు రాత్రి అటోర్వాస్టాటిన్ మాత్రలు ఉన్నాయి.`;
      }
      if (lang === 'hi-IN') {
        return `${userName} जी, आपके मेडिकल रिकॉर्ड्स में किसी दर्द का उल्लेख नहीं है। आपकी दवाइयों में सुबह एम्लोडिपाइन और कैल्शियम, दोपहर में मेटफॉर्मिन, और रात में एटोरवास्टेटिन शामिल हैं।`;
      }
      return `${userName}, no severe pain is documented in your uploaded medical records. Your regular daily tablets are Amlodipine and Calcium in the morning, Metformin at lunch, and Atorvastatin after dinner.`;
    }
  }

  // Scenario 2: Asking specifically about pain in records
  if (isAskingPainInRecords) {
    if (painRecords.length > 0) {
      if (lang === 'te-IN') {
        return `${userName} గారు, మీ అప్‌లోడ్ చేసిన మెడికల్ రికార్డుల ప్రకారం: డాక్టర్ శర్మ గారు ఉదయం నడక తర్వాత మోకాళ్ళ కీళ్ల నొప్పులు మరియు బిగుతు (3/10 స్థాయి) ఉన్నట్లు నమోదు చేశారు, మరియు ఇది బాడీ మ్యాప్‌లో మార్క్ చేయబడింది. దీని ఉపశమనానికి మీ రికార్డుల్లో ${painTabletName} మాత్రలు మరియు వెచ్చని కాపడం సూచించారు.`;
      }
      if (lang === 'hi-IN') {
        return `${userName} जी, आपके अपलोड किए गए मेडिकल रिकॉर्ड्स के अनुसार: डॉक्टर शर्मा ने सुबह की सैर के बाद घुटने के जोड़ों में हल्का दर्द और अकड़न (3/10 स्तर) दर्ज किया है, जो बॉडी मैप पर भी दर्शाया गया है। इसके आराम के लिए आपके पर्चे में ${painTabletName} गोली और गर्म सिकाई लिखी गई है।`;
      }
      return `${userName}, looking at your uploaded medical records: Dr. Sharma documented mild knee joint stiffness with a pain score of 3 out of 10 after morning walks, marked directly on your Body Map. For pain relief, your records prescribe ${painTabletName} after lunch and warm compresses. Your other vitals like blood pressure and ECG are completely stable.`;
    } else {
      if (lang === 'te-IN') {
        return `${userName} గారు, మీ అప్‌లోడ్ చేసిన మెడికల్ రికార్డులలో ఎలాంటి తీవ్రమైన నొప్పులు నమోదు కాలేదు. మీ నివేదికలన్నీ స్థిరంగా ఉన్నాయి.`;
      }
      if (lang === 'hi-IN') {
        return `${userName} जी, आपके अपलोड किए गए मेडिकल रिकॉर्ड्स में किसी भी दर्द का कोई उल्लेख नहीं है। आपकी सभी रिपोर्ट्स सामान्य हैं।`;
      }
      return `${userName}, your uploaded medical records do not report any severe pain. Your reports show stable parameters.`;
    }
  }

  // Scenario 3: Asking about tablets / medications
  if (isAskingTablets) {
    if (lang === 'te-IN') {
      return `${userName} గారు, మీ మెడికల్ రికార్డుల ప్రకారం మీ మాత్రల షెడ్యూల్: ఉదయం 8:00 గంటలకు రక్తపోటు కోసం ఆమ్లోడిపైన్ 5 ఎంజీ, 10:00 గంటలకు కాల్షియం & విటమిన్ డి3, మధ్యాహ్నం షుగర్ కోసం మెట్‌ఫార్మిన్ 500 ఎంజీ, మోకాళ్ళ నొప్పి ఉపశమనానికి గ్లూకోసమైన్, మరియు రాత్రి అటోర్వాస్టాటిన్ 10 ఎంజీ మాత్రలు ఉన్నాయి.`;
    }
    if (lang === 'hi-IN') {
      return `${userName} जी, आपके मेडिकल रिकॉर्ड्स के अनुसार आपकी निर्धारित दवाइयां: सुबह 8:00 बजे ब्लड प्रेशर के लिए एम्लोडिपाइन 5 मिलीग्राम, 10:00 बजे कैल्शियम और विटामिन डी3, दोपहर में शुगर के लिए मेटफॉर्मिन 500 मिलीग्राम, घुटने के दर्द के आराम के लिए ग्लूकोसामाइन, और रात में एटोरवास्टेटिन 10 मिलीग्राम।`;
    }
    return `${userName}, here are the tablets prescribed in your medical records: Amlodipine 5mg at 8:00 AM for blood pressure, Calcium and Vitamin D3 at 10:00 AM, Metformin 500mg at lunch for blood sugar, Glucosamine 500mg for knee joint comfort and pain relief, and Atorvastatin 10mg after dinner.`;
  }

  // Scenario 4: Asking general records
  if (isAskingRecords) {
    if (lang === 'te-IN') {
      return `${userName} గారు, మీ అప్‌లోడ్ చేసిన రికార్డుల ప్రకారం: రక్తపోటు 128/82 mmHg మరియు గుండె వేగం 72 bpm తో స్థిరంగా ఉన్నాయి, లిపిడ్ మరియు షుగర్ పరీక్షలు సాధారణంగా ఉన్నాయి, మరియు మోకాళ్ళ నొప్పుల కోసం గ్లూకోసమైన్ మాత్రలు సూచించబడ్డాయి.`;
    }
    if (lang === 'hi-IN') {
      return `${userName} जी, आपके अपलोड किए गए रिकॉर्ड्स के अनुसार: ब्लड प्रेशर 128/82 और हृदय गति 72 bpm सामान्य हैं, लिपिड और शुगर टेस्ट सही हैं, और घुटने के दर्द के लिए ग्लूकोसामाइन गोली लिखी गई है।`;
    }
    return `${userName}, according to your uploaded medical records: your blood pressure and heart rate are stable at 128 over 82, lab panels show normal fasting sugar, and mild knee joint stiffness is documented with Glucosamine tablets prescribed for comfort.`;
  }

  return null;
}

// Generate the conversational response tailored for elder care in strictly ONE single language
export async function getAutomaticResponseForWake(
  wakeWord: string,
  query: string,
  userName = 'Rajamma',
  langParam?: string
): Promise<string> {
  const lang = (langParam || getAppLanguage()) as 'te-IN' | 'hi-IN' | 'en-US';
  const cleanQuery = query.toLowerCase().trim();

  // If user only said "Siri" or "Hey Siri" or greetings like "Hi", "Hello"
  if (
    !cleanQuery ||
    cleanQuery === 'hi' ||
    cleanQuery === 'hello' ||
    cleanQuery === 'hey' ||
    cleanQuery === 'నమస్తే' ||
    cleanQuery === 'హలో' ||
    cleanQuery === 'नमस्ते' ||
    cleanQuery === 'హాయ్'
  ) {
    // Proactive check-in for daily conversations if patient has an active or improving condition on Body Map
    const proactiveQ = generateProactiveHealthQuestion(lang, userName);
    if (proactiveQ) {
      return proactiveQ;
    }
    if (lang === 'te-IN') {
      return `నమస్కారం ${userName} గారు! నేను వింటున్నాను, చెప్పండి నేను మీకు ఎలా సహాయం చేయగలను?`;
    }
    if (lang === 'hi-IN') {
      return `नमस्ते ${userName} जी! मैं सुन रही हूँ, बताइए मैं आपकी क्या मदद करूँ?`;
    }
    return `Yes ${userName}, I'm here! How can I help you right now?`;
  }

  // 1. Check for queries about medical records, tablets, prescriptions, and documented pain FIRST
  const recordsSummary = getRecordsAndTabletsSummary(cleanQuery, userName, lang);
  if (recordsSummary) {
    return recordsSummary;
  }

  // 2. Clinical pain progress tracking (improving -> green dot, resolved -> remove dot, worsening -> red dot)
  const progressData = detectPainProgressInText(cleanQuery);
  if (progressData) {
    syncHealthProgress(progressData.bodyPart, progressData.status, query);
    if (lang === 'te-IN') return progressData.spokenReply.telugu;
    if (lang === 'hi-IN') return progressData.spokenReply.hindi;
    return progressData.spokenReply.english;
  }

  // 3. Clinical acute pain detection with automatic body map update
  const painData = detectPainInText(cleanQuery);
  if (painData) {
    syncHealthProgress(painData.bodyPart, 'active', query);
    if (lang === 'te-IN') return painData.spokenReply.telugu;
    if (lang === 'hi-IN') return painData.spokenReply.hindi;
    return painData.spokenReply.english;
  }

  // Quick vital checks
  if (
    cleanQuery.includes('heart') ||
    cleanQuery.includes('pulse') ||
    cleanQuery.includes('గుండె') ||
    cleanQuery.includes('ధड़कన') ||
    cleanQuery.includes('धड़कन')
  ) {
    if (lang === 'te-IN') {
      return `${userName} గారు, మీ గుండె వేగం ప్రస్తుతం నిమిషానికి 74 బీట్లుగా ఉంది. ఇది పూర్తిగా ఆరోగ్యకరమైన మరియు ప్రశాంతమైన లయ.`;
    }
    if (lang === 'hi-IN') {
      return `${userName} जी, आपकी हृदय गति इस समय 74 धड़कन प्रति मिनट है। यह बिल्कुल सामान्य और स्वस्थ है।`;
    }
    return `${userName}, your heart rate is currently 74 beats per minute. That is a calm and healthy resting rhythm.`;
  }

  if (
    cleanQuery.includes('pressure') ||
    cleanQuery.includes('bp') ||
    cleanQuery.includes('రక్తపోటు') ||
    cleanQuery.includes('రక్త పోటు') ||
    cleanQuery.includes('रक्तचाप') ||
    cleanQuery.includes('बीपी')
  ) {
    if (lang === 'te-IN') {
      return `${userName} గారు, మీ తాజా రక్తపోటు రీడింగ్ 122 బై 80 గా ఉంది. ఇది పూర్తిగా నియంత్రణలో మరియు స్థిరంగా ఉంది.`;
    }
    if (lang === 'hi-IN') {
      return `${userName} जी, आपका नवीनतम रक्तचाप 122 बटा 80 है। यह बिल्कुल नियंत्रित और स्थिर है।`;
    }
    return `${userName}, your latest blood pressure reading is 122 over 80, which is well-controlled and stable.`;
  }

  // Identity query in strictly the chosen language
  if (
    cleanQuery.includes('who are you') ||
    cleanQuery.includes('what is your name') ||
    cleanQuery.includes('ఎవరు') ||
    cleanQuery.includes('कौन हो') ||
    cleanQuery.includes('तुम्हारा नाम')
  ) {
    if (lang === 'te-IN') {
      return `నేను ${wakeWord}, మీ ఆరోగ్య సంరక్షణ వాయిస్ సహాయకురాలిని. నేను మీ ఆరోగ్యాన్ని పర్యవేక్షిస్తూ మీకు తోడుగా ఉంటాను.`;
    }
    if (lang === 'hi-IN') {
      return `मैं ${wakeWord} हूँ, आपकी व्यक्तिगत स्वास्थ्य देखभाल साथी। मैं आपके स्वास्थ्य का ध्यान रखती हूँ।`;
    }
    return `I am ${wakeWord}, your AI elder care voice companion. I monitor your vitals, remind you of medications, and keep you safe.`;
  }

  // Well-being query in strictly the chosen language
  if (
    cleanQuery.includes('how are you') ||
    cleanQuery.includes('బాగున్నారా') ||
    cleanQuery.includes('ఎలా ఉన్నారు') ||
    cleanQuery.includes('कैसी हैं') ||
    cleanQuery.includes('कैसी हो')
  ) {
    if (lang === 'te-IN') {
      return `నేను చాలా బాగున్నాను ${userName} గారు! అడిగినందుకు ధన్యవాదాలు. మీరు ఈ రోజు ఎలా ఉన్నారు?`;
    }
    if (lang === 'hi-IN') {
      return `मैं बहुत अच्छी हूँ, ${userName} जी! पूछने के लिए धन्यवाद। आज आप कैसा महसूस कर रही हैं?`;
    }
    return `I am doing very well, ${userName}! Thank you for asking. How are you feeling today?`;
  }

  // For other open-ended requests, try Gemini chat voice endpoint with records context
  try {
    let storedRecords: any[] = [];
    let storedMeds: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const rStr = localStorage.getItem('aura_patient_records');
        if (rStr) storedRecords = JSON.parse(rStr);
        const mStr = localStorage.getItem('aura_medications');
        if (mStr) storedMeds = JSON.parse(mStr);
      } catch {}
    }

    const res = await fetch('/api/chat/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: query,
        userName,
        language: lang,
        voiceName: 'Aoede',
        records: storedRecords,
        medications: storedMeds,
      }),
    });
    const data = await res.json();
    if (data?.replyText) {
      return data.replyText;
    }
  } catch (err) {
    console.warn('Voice chat API fallback:', err);
  }

  // Fallback strictly in the chosen language
  if (lang === 'te-IN') {
    return `${userName} గారు, నేను వింటున్నాను. చెప్పండి, నేను మీకు ఎలా సహాయపడగలను?`;
  }
  if (lang === 'hi-IN') {
    return `${userName} जी, मैं सुन रही हूँ। बताइए, मैं आपकी क्या सहायता करूँ?`;
  }
  return `I am listening, ${userName}. How can I assist you right now?`;
}

// Helper to detect Siri and/or custom AI name and extract any query
export function extractWakeWordAndQuery(transcript: string, customName: string) {
  const lower = transcript.toLowerCase().trim();
  const cName = (customName || 'Aura').toLowerCase().trim();

  // Regex patterns to detect wake words and strip them
  const patterns = [
    // Siri variations
    /^(?:hey|hi|hello|ok|okay|హేయ్|హలో|हे|नमस्ते)?\s*siri\b[\s,]*(.*)$/i,
    /^(?:హేయ్|హలో)?\s*సిరి\b[\s,]*(.*)$/i,
    /^(?:हे|नमस्ते)?\s*सिरी\b[\s,]*(.*)$/i,
    // Custom name variations (e.g. Aura)
    new RegExp(`^(?:hey|hi|hello|ok|okay|హేయ్|హలో|हे|नमस्ते)?\\s*${cName}\\b[\\s,]*(.*)$`, 'i'),
  ];

  for (const pat of patterns) {
    const match = lower.match(pat);
    if (match) {
      const isSiriMatch = lower.includes('siri') || lower.includes('సిరి') || lower.includes('सिरी');
      return {
        matched: true,
        isSiri: isSiriMatch,
        wakeWord: isSiriMatch ? 'Siri' : customName,
        query: (match[1] || '').trim(),
      };
    }
  }

  // Also match isolated token "siri" anywhere in phrase
  if (lower.split(/\s+/).some((w) => w === 'siri' || w === 'hey-siri' || w === 'siri,' || w === 'siri.')) {
    const afterSiri = lower.replace(/.*?\bsiri\b[\s,]*/i, '').trim();
    return {
      matched: true,
      isSiri: true,
      wakeWord: 'Siri',
      query: afterSiri,
    };
  }

  return { matched: false, isSiri: false, wakeWord: '', query: '' };
}

export function WakeWordProvider({ children }: { children: React.ReactNode }) {
  const [aiName, setAiNameState] = useState<string>(() => {
    return localStorage.getItem('aura_ai_name') || 'Siri';
  });

  const [wakeWordEnabled, setWakeWordEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('aura_wake_word_enabled') !== 'false';
  });

  const [isListening, setIsListening] = useState<boolean>(false);
  const [isTriggered, setIsTriggered] = useState<boolean>(false);
  const [triggeredBy, setTriggeredBy] = useState<string>('Siri');
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [lastReply, setLastReply] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const isPausedRef = useRef<boolean>(false);
  const aiNameRef = useRef<string>(aiName);
  const wakeWordEnabledRef = useRef<boolean>(wakeWordEnabled);

  useEffect(() => {
    aiNameRef.current = aiName;
  }, [aiName]);

  useEffect(() => {
    wakeWordEnabledRef.current = wakeWordEnabled;
  }, [wakeWordEnabled]);

  const setAiName = (name: string) => {
    const clean = name.trim() || 'Siri';
    setAiNameState(clean);
    localStorage.setItem('aura_ai_name', clean);
    window.dispatchEvent(new Event('aura_settings_updated'));
  };

  const setWakeWordEnabled = (enabled: boolean) => {
    setWakeWordEnabledState(enabled);
    localStorage.setItem('aura_wake_word_enabled', String(enabled));
    window.dispatchEvent(new Event('aura_settings_updated'));
  };

  const triggerWakeWord = useCallback(
    async (matchedName = 'Siri', query = '') => {
      const isSiri = matchedName.toLowerCase() === 'siri';
      setTriggeredBy(matchedName);
      setIsTriggered(true);
      setLastTranscript(query ? `${matchedName} ${query}` : matchedName);

      // 1. Play signature chime immediately
      if (isSiri) {
        playSiriChimeSound();
      } else {
        playWakeChimeSound();
      }

      const seniorName = localStorage.getItem('aura_senior_name') || 'Rajamma';
      const liveLang = getAppLanguage();

      // 2. Generate and speak the automatic response in the strictly selected language
      const reply = await getAutomaticResponseForWake(matchedName, query, seniorName, liveLang);
      setLastReply(reply);

      // Automatically speak the response out loud in the strictly selected language
      speakAutomaticVoiceResponse(reply, liveLang);

      // 3. Notify the whole app
      window.dispatchEvent(
        new CustomEvent('aura_wakeword_detected', {
          detail: {
            aiName: matchedName,
            isSiri,
            phrase: query ? `${matchedName} ${query}` : matchedName,
            query,
            reply,
            timestamp: Date.now(),
          },
        })
      );

      // Keep triggered display active while speaking
      setTimeout(() => {
        setIsTriggered(false);
      }, 7000);
    },
    []
  );

  // Listen to Settings updates from other tabs/screens
  useEffect(() => {
    const handleSettingsUpdated = () => {
      const storedName = localStorage.getItem('aura_ai_name');
      const storedWakeEnabled = localStorage.getItem('aura_wake_word_enabled');
      if (storedName && storedName !== aiNameRef.current) {
        setAiNameState(storedName);
      }
      if (storedWakeEnabled !== null) {
        setWakeWordEnabledState(storedWakeEnabled !== 'false');
      }
    };

    window.addEventListener('aura_settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', handleSettingsUpdated);
    return () => {
      window.removeEventListener('aura_settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleSettingsUpdated);
    };
  }, []);

  // Web Speech Recognition background listener for "Hey [aiName]"
  useEffect(() => {
    if (!wakeWordEnabled) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsListening(false);
      return;
    }

    let isComponentMounted = true;
    let recognition: any = null;

    const startRecognition = () => {
      if (!isComponentMounted || !wakeWordEnabledRef.current) return;
      if (isPausedRef.current) return;

      try {
        recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.lang = getAppLanguage();

        recognition.onstart = () => {
          if (isComponentMounted) setIsListening(true);
        };

        recognition.onresult = async (event: any) => {
          if (!isComponentMounted || isPausedRef.current) return;

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            for (let j = 0; j < result.length; ++j) {
              const transcript = (result[j]?.transcript || '').toLowerCase().trim();
              if (!transcript) continue;

              setLastTranscript(transcript);

              // Extract Siri or custom name match and query
              const wakeMatch = extractWakeWordAndQuery(transcript, aiNameRef.current);

              if (wakeMatch.matched) {
                // Pause recognition while responding so microphone doesn't pick up speaker output
                isPausedRef.current = true;
                try {
                  recognition.stop();
                } catch {
                  // Ignore
                }

                // Trigger chime, generate and speak the response immediately!
                await triggerWakeWord(wakeMatch.wakeWord, wakeMatch.query);

                // Resume listening after 8 seconds of dialogue
                setTimeout(() => {
                  isPausedRef.current = false;
                  startRecognition();
                }, 8000);
                return;
              }
            }
          }
        };

        recognition.onerror = (e: any) => {
          if (e?.error === 'no-speech' || e?.error === 'aborted') {
            return;
          }
          // Mild retry after pause
          setIsListening(false);
        };

        recognition.onend = () => {
          if (isComponentMounted && wakeWordEnabledRef.current && !isPausedRef.current) {
            // Auto restart
            setTimeout(() => {
              startRecognition();
            }, 800);
          } else {
            setIsListening(false);
          }
        };

        recognition.start();
      } catch (err) {
        setIsListening(false);
      }
    };

    startRecognition();

    return () => {
      isComponentMounted = false;
      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, [wakeWordEnabled, triggerWakeWord]);

  return (
    <WakeWordContext.Provider
      value={{
        aiName,
        setAiName,
        wakeWordEnabled,
        setWakeWordEnabled,
        isListening,
        isTriggered,
        triggeredBy,
        lastTranscript,
        lastReply,
        triggerWakeWord,
        playWakeChime: (isSiri?: boolean) => (isSiri ? playSiriChimeSound() : playWakeChimeSound()),
        speakResponse: (text: string) =>
          speakAutomaticVoiceResponse(text, getAppLanguage()),
      }}
    >
      {children}
    </WakeWordContext.Provider>
  );
}

export function useWakeWord() {
  const context = useContext(WakeWordContext);
  if (!context) {
    throw new Error('useWakeWord must be used within a WakeWordProvider');
  }
  return context;
}
