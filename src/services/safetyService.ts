import type { SafetyAssessment, SafetyTrigger } from '../types/chat';

const severeDistressPatterns = [
  /\b(can't cope|cannot cope|falling apart|breaking down|overwhelmed|panicking)\b/i,
  /\b(i am not okay|i'm not okay|i feel unsafe|i feel out of control)\b/i,
];

const selfHarmPatterns = [
  /\b(kill myself|end my life|want to die|don't want to live|suicide|suicidal)\b/i,
  /\b(hurt myself|harm myself|self-harm|cut myself)\b/i,
];

const urgentMedicalPatterns = [
  /\b(chest pain|trouble breathing|can't breathe|difficulty breathing)\b/i,
  /\b(passing out|fainted|seizure|stroke|heart attack)\b/i,
  /\b(heavy bleeding|severe bleeding|overdose|poisoned|emergency)\b/i,
];

const hasMatch = (message: string, patterns: RegExp[]): boolean => {
  return patterns.some((pattern) => pattern.test(message));
};

const addTrigger = (triggers: Set<SafetyTrigger>, condition: boolean, trigger: SafetyTrigger): void => {
  if (condition) {
    triggers.add(trigger);
  }
};

export const assessMessageSafety = (message: string): SafetyAssessment => {
  const normalizedMessage = message.trim();
  const triggers = new Set<SafetyTrigger>();

  // Demo safety layer only. This is a conservative keyword check, not a clinical system.
  addTrigger(triggers, hasMatch(normalizedMessage, severeDistressPatterns), 'severe_distress');
  addTrigger(triggers, hasMatch(normalizedMessage, selfHarmPatterns), 'self_harm_risk');
  addTrigger(
    triggers,
    hasMatch(normalizedMessage, urgentMedicalPatterns),
    'urgent_medical_concern',
  );

  return {
    triggered: triggers.size > 0,
    triggers: [...triggers],
  };
};
