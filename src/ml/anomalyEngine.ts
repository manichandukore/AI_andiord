export interface ElderCheckInMetrics {
  elderId: string;
  timestamp: string;
  pauseTime: number;        // in seconds (e.g. 1.2s normal, 3.8s delayed)
  responseWords: number;    // average words per response (e.g. 26 normal, 8 short)
  repetitionScore: number;  // 0.0 to 1.0 (e.g. 0.05 normal, 0.28 elevated)
  missedDoses: number;      // missed doses count (e.g. 0 normal, 1+ missed)
  moodScore: number;        // 1 to 10 (e.g. 8.5 normal, 5.5 low)
}

export interface MetricDeviation {
  featureName: string;
  displayName: string;
  currentValue: number;
  baselineValue: number;
  percentageChange: number;
  unit: string;
  isSignificant: boolean;
  direction: 'increased' | 'decreased' | 'stable';
  findingText: string;
}

export interface AnomalyEvaluationResult {
  elderId: string;
  isAnomaly: boolean;
  anomalyScore: number;       // 0.0 to 1.0 (higher = more anomalous)
  baselineDaysCount: number;
  deviations: MetricDeviation[];
  caregiverFindings: string[];
  recommendedAction: string;
  safetyDisclaimer: string;
}

class IsolationTreeNode {
  left?: IsolationTreeNode;
  right?: IsolationTreeNode;
  splitFeature?: number;
  splitValue?: number;
  size?: number;
  isLeaf: boolean = false;
}

class IsolationForest {
  private trees: IsolationTreeNode[] = [];
  private numTrees: number;
  private subSampleSize: number;

  constructor(numTrees = 100, subSampleSize = 256) {
    this.numTrees = numTrees;
    this.subSampleSize = subSampleSize;
  }

  // Average path length helper c(n) for normalization
  private c(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
  }

  private buildTree(data: number[][], currentHeight: number, maxHeight: number): IsolationTreeNode {
    const node = new IsolationTreeNode();
    if (currentHeight >= maxHeight || data.length <= 1) {
      node.isLeaf = true;
      node.size = data.length;
      return node;
    }

    const numFeatures = data[0].length;
    const splitFeature = Math.floor(Math.random() * numFeatures);

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const row of data) {
      const val = row[splitFeature];
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }

    if (minVal === maxVal) {
      node.isLeaf = true;
      node.size = data.length;
      return node;
    }

    const splitValue = minVal + Math.random() * (maxVal - minVal);
    const leftData = data.filter((row) => row[splitFeature] < splitValue);
    const rightData = data.filter((row) => row[splitFeature] >= splitValue);

    node.splitFeature = splitFeature;
    node.splitValue = splitValue;
    node.left = this.buildTree(leftData, currentHeight + 1, maxHeight);
    node.right = this.buildTree(rightData, currentHeight + 1, maxHeight);

    return node;
  }

  fit(data: number[][]) {
    this.trees = [];
    const sampleSize = Math.min(data.length, this.subSampleSize);
    const maxHeight = Math.ceil(Math.log2(sampleSize));

    for (let i = 0; i < this.numTrees; i++) {
      const shuffled = [...data].sort(() => 0.5 - Math.random());
      const subSample = shuffled.slice(0, sampleSize);
      const tree = this.buildTree(subSample, 0, maxHeight);
      this.trees.push(tree);
    }
  }

  private pathLength(x: number[], node: IsolationTreeNode, currentPathLength: number): number {
    if (node.isLeaf) {
      return currentPathLength + this.c(node.size || 1);
    }

    const val = x[node.splitFeature!];
    if (val < node.splitValue!) {
      return this.pathLength(x, node.left!, currentPathLength + 1);
    } else {
      return this.pathLength(x, node.right!, currentPathLength + 1);
    }
  }

  predictAnomalyScore(x: number[], datasetSize: number): number {
    if (this.trees.length === 0) return 0.5;
    let avgPathLength = 0;
    for (const tree of this.trees) {
      avgPathLength += this.pathLength(x, tree, 0);
    }
    avgPathLength /= this.trees.length;
    const cN = this.c(datasetSize);
    if (cN === 0) return 0.5;
    return Math.pow(2, -avgPathLength / cN);
  }
}

function metricsToVector(m: ElderCheckInMetrics): number[] {
  return [m.pauseTime, m.responseWords, m.repetitionScore, m.missedDoses, m.moodScore];
}

export function evaluatePersonalAnomaly(
  current: ElderCheckInMetrics,
  historicalBaseline: ElderCheckInMetrics[]
): AnomalyEvaluationResult {
  const n = historicalBaseline.length;

  if (n === 0) {
    return {
      elderId: current.elderId,
      isAnomaly: false,
      anomalyScore: 0.1,
      baselineDaysCount: 0,
      deviations: [],
      caregiverFindings: ["Establishing initial personal baseline for " + current.elderId],
      recommendedAction: "Continue regular daily check-ins to build accuracy.",
      safetyDisclaimer:
        "Safety Rule: The model detects statistical behavioral deviations to assist caregivers and does NOT diagnose medical conditions."
    };
  }

  const baselineMeans = {
    pauseTime: historicalBaseline.reduce((acc, h) => acc + h.pauseTime, 0) / n,
    responseWords: historicalBaseline.reduce((acc, h) => acc + h.responseWords, 0) / n,
    repetitionScore: historicalBaseline.reduce((acc, h) => acc + h.repetitionScore, 0) / n,
    missedDoses: historicalBaseline.reduce((acc, h) => acc + h.missedDoses, 0) / n,
    moodScore: historicalBaseline.reduce((acc, h) => acc + h.moodScore, 0) / n
  };

  const vectors = historicalBaseline.map(metricsToVector);
  const currentVector = metricsToVector(current);

  const forest = new IsolationForest(50, Math.min(n, 128));
  forest.fit(vectors);
  const rawScore = forest.predictAnomalyScore(currentVector, n);

  const featureConfigs: Array<{
    key: keyof ElderCheckInMetrics;
    name: string;
    unit: string;
    thresholdPct: number;
    worseWhenHigher: boolean;
  }> = [
    { key: "pauseTime", name: "Speech Pause Time", unit: "s", thresholdPct: 30, worseWhenHigher: true },
    { key: "responseWords", name: "Response Length", unit: "words", thresholdPct: 35, worseWhenHigher: false },
    { key: "repetitionScore", name: "Word Repetition Rate", unit: "%", thresholdPct: 40, worseWhenHigher: true },
    { key: "missedDoses", name: "Missed Medication Doses", unit: "doses", thresholdPct: 10, worseWhenHigher: true },
    { key: "moodScore", name: "Wellness Mood Score", unit: "/10", thresholdPct: 25, worseWhenHigher: false }
  ];

  const deviations: MetricDeviation[] = [];
  const caregiverFindings: string[] = [];

  featureConfigs.forEach((cfg) => {
    const curVal = current[cfg.key] as number;
    const baseVal = baselineMeans[cfg.key as keyof typeof baselineMeans];
    const diff = curVal - baseVal;
    const pctChange = baseVal !== 0 ? (diff / baseVal) * 100 : curVal * 100;
    const direction: 'increased' | 'decreased' | 'stable' =
      Math.abs(pctChange) < 10 ? "stable" : pctChange > 0 ? "increased" : "decreased";

    const isSignificant =
      Math.abs(pctChange) >= cfg.thresholdPct || (cfg.key === "missedDoses" && curVal > 0);

    let findingText = "";
    if (isSignificant) {
      if (cfg.key === "pauseTime") {
        findingText = `Speech pause duration increased to ${curVal.toFixed(1)}s (personal avg: ${baseVal.toFixed(1)}s, +${pctChange.toFixed(0)}%).`;
      } else if (cfg.key === "responseWords") {
        findingText = `Response word count dropped to ${curVal} words (personal baseline: ${baseVal.toFixed(0)} words).`;
      } else if (cfg.key === "repetitionScore") {
        findingText = `Repetition index elevated to ${(curVal * 100).toFixed(0)}% (personal avg: ${(baseVal * 100).toFixed(0)}%).`;
      } else if (cfg.key === "missedDoses") {
        findingText = `Recorded ${curVal} missed medication dose(s) compared to usual strict compliance.`;
      } else if (cfg.key === "moodScore") {
        findingText = `Mood rating dropped to ${curVal}/10 (personal baseline score: ${baseVal.toFixed(1)}/10).`;
      }
      caregiverFindings.push(findingText);
    }

    deviations.push({
      featureName: cfg.key,
      displayName: cfg.name,
      currentValue: curVal,
      baselineValue: baseVal,
      percentageChange: pctChange,
      unit: cfg.unit,
      isSignificant,
      direction,
      findingText: findingText || `${cfg.name} is stable near baseline (${curVal}${cfg.unit}).`
    });
  });

  const isAnomaly = rawScore > 0.6 || caregiverFindings.length >= 2 || current.missedDoses >= 2;

  let recommendedAction = "No significant anomaly detected. All metrics align with personal baseline.";
  if (isAnomaly) {
    if (current.missedDoses > 0) {
      recommendedAction = "High Priority: Check on elder's medication routine and conduct a gentle call.";
    } else {
      recommendedAction = "Moderate Attention: Noticeable shift in speech pauses or response length. Consider placing a brief friendly wellness call.";
    }
  }

  return {
    elderId: current.elderId,
    isAnomaly,
    anomalyScore: Number(rawScore.toFixed(3)),
    baselineDaysCount: n,
    deviations,
    caregiverFindings: caregiverFindings.length > 0 ? caregiverFindings : ["All indicators are consistent with Rajamma's personal 14-day baseline."],
    recommendedAction,
    safetyDisclaimer:
      "Safety Rule: The model detects statistical deviations from personal baselines to assist caregivers; it does NOT diagnose medical conditions."
  };
}

export const MOCK_RAJAMMA_BASELINE: ElderCheckInMetrics[] = [
  { elderId: "rajamma", timestamp: "2026-10-10", pauseTime: 1.2, responseWords: 26, repetitionScore: 0.05, missedDoses: 0, moodScore: 8.5 },
  { elderId: "rajamma", timestamp: "2026-10-11", pauseTime: 1.1, responseWords: 24, repetitionScore: 0.04, missedDoses: 0, moodScore: 8.0 },
  { elderId: "rajamma", timestamp: "2026-10-12", pauseTime: 1.3, responseWords: 28, repetitionScore: 0.06, missedDoses: 0, moodScore: 9.0 },
  { elderId: "rajamma", timestamp: "2026-10-13", pauseTime: 1.0, responseWords: 25, repetitionScore: 0.03, missedDoses: 0, moodScore: 8.5 },
  { elderId: "rajamma", timestamp: "2026-10-14", pauseTime: 1.4, responseWords: 22, repetitionScore: 0.05, missedDoses: 0, moodScore: 8.0 },
  { elderId: "rajamma", timestamp: "2026-10-15", pauseTime: 1.2, responseWords: 27, repetitionScore: 0.04, missedDoses: 0, moodScore: 8.8 },
  { elderId: "rajamma", timestamp: "2026-10-16", pauseTime: 1.1, responseWords: 25, repetitionScore: 0.05, missedDoses: 0, moodScore: 8.2 },
  { elderId: "rajamma", timestamp: "2026-10-17", pauseTime: 1.3, responseWords: 24, repetitionScore: 0.06, missedDoses: 0, moodScore: 8.0 },
  { elderId: "rajamma", timestamp: "2026-10-18", pauseTime: 1.0, responseWords: 29, repetitionScore: 0.04, missedDoses: 0, moodScore: 9.0 },
  { elderId: "rajamma", timestamp: "2026-10-19", pauseTime: 1.2, responseWords: 26, repetitionScore: 0.05, missedDoses: 0, moodScore: 8.5 },
  { elderId: "rajamma", timestamp: "2026-10-20", pauseTime: 1.3, responseWords: 23, repetitionScore: 0.07, missedDoses: 0, moodScore: 8.0 },
  { elderId: "rajamma", timestamp: "2026-10-21", pauseTime: 1.1, responseWords: 25, repetitionScore: 0.04, missedDoses: 0, moodScore: 8.4 },
  { elderId: "rajamma", timestamp: "2026-10-22", pauseTime: 1.2, responseWords: 27, repetitionScore: 0.05, missedDoses: 0, moodScore: 8.6 },
  { elderId: "rajamma", timestamp: "2026-10-23", pauseTime: 1.2, responseWords: 25, repetitionScore: 0.05, missedDoses: 0, moodScore: 8.5 }
];
