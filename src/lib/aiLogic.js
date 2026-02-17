// Advanced Symptom Mapping with Weights
const KNOWLEDGE_BASE = {
  neurologist: {
    keywords: ['head', 'migraine', 'brain', 'dizzy', 'vision', 'numbness', 'seizure'],
    weight: 10
  },
  cardiologist: {
    keywords: ['heart', 'chest', 'breath', 'palpitation', 'pulse', 'pressure'],
    weight: 10
  },
  orthopedic: {
    keywords: ['bone', 'joint', 'knee', 'back', 'fracture', 'muscle', 'pain'],
    weight: 8
  },
  dermatologist: {
    keywords: ['skin', 'rash', 'acne', 'spot', 'hair', 'itch'],
    weight: 9
  },
  general: {
    keywords: ['fever', 'flu', 'cold', 'cough', 'sick', 'tired', 'checkup'],
    weight: 5
  }
};

export function analyzeSymptoms(query) {
  if (!query) return null;
  const lowerQuery = query.toLowerCase();
  
  let bestMatch = null;
  let maxScore = 0;

  for (const [specialty, data] of Object.entries(KNOWLEDGE_BASE)) {
    let score = 0;
    data.keywords.forEach(word => {
      if (lowerQuery.includes(word)) {
        score += data.weight;
      }
    });

    if (score > maxScore) {
      maxScore = score;
      bestMatch = specialty;
    }
  }

  // Capitalize for display (e.g., "Cardiologist")
  if (bestMatch) {
    return bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1);
  }
  
  return null;
}