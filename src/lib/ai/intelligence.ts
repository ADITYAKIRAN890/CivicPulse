import { Complaint, ComplaintCategory, ComplaintPriority, DuplicateSuggestion, AIPriorityAnalysis } from '@/types';

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can\'t', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
  'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into',
  'is', 'isn\'t', 'it', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same',
  'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours',
]);

const STEM_RULES: Record<string, string> = {
  sparks: 'spark',
  sparking: 'spark',
  wires: 'wire',
  wiring: 'wire',
  outlets: 'outlet',
  sockets: 'socket',
  breakers: 'breaker',
  switches: 'switch',
  switchboards: 'switchboard',
  lights: 'light',
  lighting: 'light',
  fans: 'fan',
  coolers: 'cooler',
  heaters: 'heater',
  filters: 'filter',
  pumps: 'pump',
  leaks: 'leak',
  leaking: 'leak',
  leakage: 'leak',
  pipes: 'pipe',
  drains: 'drain',
  drainage: 'drain',
  overflows: 'overflow',
  overflowing: 'overflow',
  routers: 'router',
  connections: 'connect',
  networks: 'network',
  devices: 'device',
  machines: 'machine',
  equipments: 'equipment',
  damaged: 'damage',
  damages: 'damage',
  broken: 'break',
  breaking: 'break',
  fails: 'fail',
  failed: 'fail',
  failing: 'fail',
  hazardous: 'hazard',
  hazards: 'hazard',
  dangerous: 'danger',
  urgent: 'urgency',
  emergency: 'urgency',
  floors: 'floor',
  corridors: 'corridor',
  rooms: 'room',
  hostels: 'hostel',
  blocks: 'block',
  labs: 'lab',
  laboratories: 'lab',
  toilets: 'toilet',
  washrooms: 'washroom',
  restrooms: 'washroom',
  hygienic: 'hygiene',
  unhygienic: 'hygiene',
  dirty: 'clean',
  cleaning: 'clean',
  food: 'canteen',
  mess: 'canteen',
  meals: 'canteen',
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .map((w) => STEM_RULES[w] || w);
}

export function createTermFrequencyMap(tokens: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const token of tokens) {
    map.set(token, (map.get(token) || 0) + 1);
  }
  return map;
}

export function calculateCosineSimilarity(tfA: Map<string, number>, tfB: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const count of tfA.values()) {
    normA += count * count;
  }
  for (const count of tfB.values()) {
    normB += count * count;
  }

  if (normA === 0 || normB === 0) return 0;

  for (const [term, countA] of tfA.entries()) {
    const countB = tfB.get(term);
    if (countB) {
      dotProduct += countA * countB;
    }
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): { score: number; intersection: string[] } {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection: string[] = [];

  for (const item of setA) {
    if (setB.has(item)) {
      intersection.push(item);
    }
  }

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  const score = unionSize === 0 ? 0 : intersection.length / unionSize;

  return { score, intersection };
}

export function calculateNgramOverlap(a: string, b: string, n = 3): number {
  const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanB = b.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (cleanA.length < n || cleanB.length < n) return 0;

  const ngramsA = new Set<string>();
  for (let i = 0; i <= cleanA.length - n; i++) {
    ngramsA.add(cleanA.substring(i, i + n));
  }

  let matches = 0;
  const ngramsB = new Set<string>();
  for (let i = 0; i <= cleanB.length - n; i++) {
    const sub = cleanB.substring(i, i + n);
    ngramsB.add(sub);
    if (ngramsA.has(sub)) {
      matches++;
    }
  }

  const total = new Set([...ngramsA, ...ngramsB]).size;
  return total === 0 ? 0 : matches / total;
}

// Zero-budget fast local duplicate suggestions engine
export function findDuplicateSuggestions(
  title: string,
  description: string,
  category: ComplaintCategory,
  campusZone: string,
  existingComplaints: Complaint[]
): DuplicateSuggestion[] {
  const queryText = `${title} ${description} ${campusZone}`;
  const queryTokens = tokenize(queryText);
  const queryTf = createTermFrequencyMap(queryTokens);

  const results: DuplicateSuggestion[] = [];

  // Filter out resolved complaints older than 30 days, prioritize active or recent
  for (const existing of existingComplaints) {
    // Only check active or recently submitted tickets
    if (existing.status === 'verified_by_student') continue;

    const existingText = `${existing.title} ${existing.description} ${existing.campusZone}`;
    const existingTokens = tokenize(existingText);
    const existingTf = createTermFrequencyMap(existingTokens);

    const cosineSim = calculateCosineSimilarity(queryTf, existingTf);
    const { score: jaccardSim, intersection } = calculateJaccardSimilarity(queryTokens, existingTokens);
    const ngramSim = calculateNgramOverlap(title, existing.title);

    // Give category and campus zone match bonus
    let categoryBonus = 0;
    if (existing.category === category) categoryBonus += 0.15;
    if (existing.campusZone.toLowerCase() === campusZone.toLowerCase()) categoryBonus += 0.15;

    const blendedScore = Math.min(
      1.0,
      cosineSim * 0.45 + jaccardSim * 0.30 + ngramSim * 0.10 + categoryBonus
    );

    // If similarity >= 0.35, surface as a relevant or potential duplicate
    if (blendedScore >= 0.35 && intersection.length >= 2) {
      results.push({
        complaint: existing,
        similarityScore: Math.round(blendedScore * 100) / 100,
        matchedTokens: intersection.slice(0, 6),
      });
    }
  }

  // Sort highest similarity first
  return results.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 3);
}

// Explainable Priority Scoring & Rule-based Classification
export function analyzePriorityAndClassification(
  title: string,
  description: string,
  category: ComplaintCategory,
  campusZone: string
): AIPriorityAnalysis {
  const text = `${title} ${description}`.toLowerCase();
  let score = 30; // baseline medium-low
  const reasons: string[] = [];

  // 1. Safety Hazard & Critical Emergency Keywords (+35 to +45)
  const criticalHazards = [
    { words: ['spark', 'shock', 'short circuit', 'fire', 'smoke', 'live wire', 'burning'], reason: 'Electrical or fire hazard detected (+40 pts)', points: 40 },
    { words: ['collapse', 'falling debris', 'cracked pillar', 'broken glass window', 'structural'], reason: 'Physical structural safety danger (+35 pts)', points: 35 },
    { words: ['gas leak', 'chemical spill', 'toxic fume', 'mercury', 'centrifuge'], reason: 'Laboratory chemical or mechanical hazard (+38 pts)', points: 38 },
    { words: ['stagnant water', 'dengue', 'mosquito breeding', 'foul smell', 'overflowing sewage', 'contaminated'], reason: 'Public health and sanitation hazard (+30 pts)', points: 30 },
  ];

  for (const hazard of criticalHazards) {
    if (hazard.words.some((w) => text.includes(w))) {
      score += hazard.points;
      reasons.push(hazard.reason);
      break; // Only apply primary hazard category once
    }
  }

  // 2. High Footfall / Campus Impact Area (+20 to +25)
  const zoneLower = campusZone.toLowerCase();
  if (
    zoneLower.includes('hostel') ||
    zoneLower.includes('library') ||
    zoneLower.includes('exam') ||
    zoneLower.includes('auditorium') ||
    zoneLower.includes('cafeteria') ||
    zoneLower.includes('mess')
  ) {
    score += 20;
    reasons.push(`High student footfall location: ${campusZone} (+20 pts)`);
  }

  // 3. Widespread disruption indicator (+15)
  const wideDisruptionWords = ['entire floor', 'all rooms', 'whole wing', 'every student', 'everyone', 'blocked', 'cut off'];
  if (wideDisruptionWords.some((w) => text.includes(w))) {
    score += 15;
    reasons.push('Widespread student cohort impact indicated (+15 pts)');
  }

  // 4. Urgency language (+10)
  const urgencyWords = ['urgent', 'emergency', 'immediate', 'critical', 'asap', 'danger', 'hazard'];
  if (urgencyWords.some((w) => text.includes(w))) {
    score += 10;
    reasons.push('Urgent resolution language identified (+10 pts)');
  }

  // Clamp score 0 to 100
  score = Math.min(100, Math.max(15, score));

  let priority: ComplaintPriority = 'medium';
  if (score >= 85) {
    priority = 'critical';
  } else if (score >= 65) {
    priority = 'high';
  } else if (score >= 40) {
    priority = 'medium';
  } else {
    priority = 'low';
  }

  // Human review flag for borderline or high-impact ambiguous reports
  const humanReviewRequired = score >= 60 && score <= 70;

  // Department mapping
  const departmentMap: Record<ComplaintCategory, string> = {
    electricity: 'Electrical & Power Facilities',
    wifi: 'IT Network & Hostel Wi-Fi',
    water: 'Electrical & Power Facilities',
    hygiene: 'Sanitation & Housekeeping',
    hostel: 'Hostel Maintenance Operations',
    infrastructure: 'Campus Estate & Civil Works',
    lab_equipment: 'Academic Laboratory Support',
    cafeteria: 'Central Cafeteria Operations',
    classroom_av: 'Multimedia & Lecture Hall AV Support',
    security: 'Campus Proctorial & Security Division',
  };

  if (reasons.length === 0) {
    reasons.push('Standard civic ticket baseline metrics applied (+30 pts)');
  }

  return {
    score,
    priority,
    reasons,
    suggestedDepartment: departmentMap[category] || 'Campus Estate & Civil Works',
    suggestedCategory: category,
    humanReviewRequired,
  };
}
