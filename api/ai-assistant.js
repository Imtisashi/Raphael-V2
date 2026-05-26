const specialtyRules = [
  {
    specialty: 'Cardiologist',
    terms: ['chest pain', 'pressure in chest', 'heart pain', 'palpitation', 'shortness of breath', 'breathless', 'high bp', 'blood pressure'],
  },
  {
    specialty: 'Neurologist',
    terms: ['migraine', 'severe headache', 'headache', 'dizzy', 'dizziness', 'numbness', 'weakness', 'memory', 'seizure'],
  },
  {
    specialty: 'Dermatologist',
    terms: ['rash', 'itching', 'skin', 'acne', 'allergy on skin', 'spots', 'eczema', 'hair fall'],
  },
  {
    specialty: 'Orthopedic',
    terms: ['joint', 'knee', 'back pain', 'bone', 'fracture', 'sprain', 'shoulder', 'neck pain', 'arthritis'],
  },
  {
    specialty: 'Ophthalmologist',
    terms: ['eye', 'vision', 'blurred vision', 'red eye', 'eye pain', 'watery eyes', 'sight'],
  },
  {
    specialty: 'General Physician',
    terms: ['fever', 'flu', 'cough', 'cold', 'pain', 'stomach', 'vomit', 'diarrhea', 'weakness', 'body ache', 'infection'],
  },
];

const emergencyTerms = [
  'severe chest pain',
  'trouble breathing',
  'cannot breathe',
  'fainting',
  'stroke',
  'seizure',
  'heavy bleeding',
  'unconscious',
  'suicidal',
];

const fallbackGuidance = (message, doctors = []) => {
  const query = String(message || '').toLowerCase();
  if (emergencyTerms.some(term => query.includes(term))) {
    return {
      specialty: 'Emergency Care',
      shouldSearch: false,
      searchQuery: '',
      response: 'This may need urgent care. Please contact local emergency services or visit the nearest emergency department now.',
      provider: 'local',
    };
  }

  const matchedRule = specialtyRules
    .map(rule => ({
      ...rule,
      score: rule.terms.reduce((score, term) => score + (query.includes(term) ? term.length : 0), 0),
    }))
    .filter(rule => rule.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (!matchedRule) {
    return {
      specialty: null,
      shouldSearch: false,
      searchQuery: '',
      response: 'I need one or two more details to route you well. What is the main symptom, how long has it been happening, and is it mild, moderate, or severe?',
      provider: 'local',
    };
  }

  const count = doctors.filter(doctor => doctor.specialty === matchedRule.specialty).length;
  return {
    specialty: matchedRule.specialty,
    shouldSearch: true,
    searchQuery: matchedRule.specialty,
    response: `I found ${count || 'available'} ${matchedRule.specialty.toLowerCase()} option${count === 1 ? '' : 's'} for you. This is guidance, not a diagnosis; seek urgent care if symptoms feel severe or sudden.`,
    provider: 'local',
  };
};

const assistantPrompt = ({ message, doctors }) => `
You are Rapha'l Assist for a healthcare booking app in India.
Return only valid JSON with:
{
  "response": "short patient-friendly guidance",
  "specialty": "one of: General Physician, Cardiologist, Neurologist, Dermatologist, Orthopedic, Ophthalmologist, Emergency Care, or null",
  "shouldSearch": true or false,
  "searchQuery": "specialty or search phrase"
}

Safety rules:
- Do not diagnose.
- Do not prescribe medicine.
- If symptoms may be urgent, tell the patient to seek emergency care now.
- Otherwise route to the best specialty and mention that guidance is not a diagnosis.

Patient message: ${message}
Available doctors: ${JSON.stringify(doctors || [])}
`;

const parseJsonText = (text) => {
  if (!text) return null;
  const cleaned = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const getEnv = (name) => globalThis['process']?.env?.[name] || '';

const callOpenAI = async (payload) => {
  const apiKey = getEnv('OPENAI_API_KEY');
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getEnv('OPENAI_MODEL') || 'gpt-5-mini',
      input: assistantPrompt(payload),
      max_output_tokens: 450,
    }),
  });

  if (!response.ok) throw new Error('OpenAI request failed');
  const data = await response.json();
  const text = data.output_text || data.output?.flatMap(item => item.content || []).map(part => part.text).filter(Boolean).join('\n');
  const parsed = parseJsonText(text);
  return parsed ? { ...parsed, provider: 'openai' } : null;
};

const callGemini = async (payload) => {
  const apiKey = getEnv('GEMINI_API_KEY');
  if (!apiKey) return null;

  const model = getEnv('GEMINI_MODEL') || 'gemini-2.0-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: assistantPrompt(payload) }] }],
      generationConfig: { response_mime_type: 'application/json' },
    }),
  });

  if (!response.ok) throw new Error('Gemini request failed');
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map(part => part.text).filter(Boolean).join('\n');
  const parsed = parseJsonText(text);
  return parsed ? { ...parsed, provider: 'gemini' } : null;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = {
    message: req.body?.message || '',
    doctors: Array.isArray(req.body?.doctors) ? req.body.doctors : [],
  };

  if (!payload.message.trim()) {
    return res.status(200).json(fallbackGuidance('', payload.doctors));
  }

  const providerOrder = getEnv('AI_PROVIDER') === 'openai'
    ? [callOpenAI, callGemini]
    : [callGemini, callOpenAI];

  for (const provider of providerOrder) {
    try {
      const result = await provider(payload);
      if (result?.response) return res.status(200).json(result);
    } catch {
      // Try the next provider, then fall back to deterministic routing.
    }
  }

  return res.status(200).json(fallbackGuidance(payload.message, payload.doctors));
}
