export type ChatRole = 'user' | 'assistant';

export type ChatMessageInput = {
  role: ChatRole;
  content: string;
};

export type ChatPromptContext = {
  memorySummary: string;
  recentMessages: ChatMessageInput[];
  latestUserMessage: string;
  safetyAssessment: SafetyAssessment;
};

export type SafetyTrigger =
  | 'severe_distress'
  | 'self_harm_risk'
  | 'urgent_medical_concern';

export type SafetyAssessment = {
  triggered: boolean;
  triggers: SafetyTrigger[];
};
