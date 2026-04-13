import { env } from '../config/env';
import { openai } from '../lib/openai';
import type { ChatMessageInput, ChatPromptContext, SafetyTrigger } from '../types/chat';

const assistantInstructions = `
You are a supportive healthcare-adjacent assistant.
You are not a doctor and you must not diagnose conditions, recommend treatment plans, or claim medical certainty.
Provide calm, practical, non-diagnostic support, help users organize concerns, encourage professional care when appropriate, and include a short safety disclaimer when the topic calls for it.
If the user mentions severe symptoms, self-harm, chest pain, trouble breathing, stroke-like symptoms, or an emergency, advise them to seek immediate emergency care.
Keep responses concise, warm, and helpful.
`.trim();

const memoryInstructions = `
Update the user's long-term memory summary for future support chats.
Keep only durable, useful, non-diagnostic context such as communication preferences, recurring stressors, support needs, life context, goals, and logistics.
Do not include speculative medical claims, diagnosis, or detailed transient small talk.
Return plain text only, in 3 to 6 short bullet points.
`.trim();

const fallbackDisclaimer =
  'This assistant offers general support only and is not a substitute for professional medical advice.';

const safetyTriggerLabels: Record<SafetyTrigger, string> = {
  severe_distress: 'severe distress',
  self_harm_risk: 'self-harm risk',
  urgent_medical_concern: 'urgent medical concern',
};

const formatConversation = (messages: ChatMessageInput[]): string => {
  return messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n');
};

const formatPromptContext = (context: ChatPromptContext): string => {
  const recentConversation =
    context.recentMessages.length > 0
      ? formatConversation(context.recentMessages)
      : 'No earlier messages in this conversation.';
  const safetyStatus = context.safetyAssessment.triggered
    ? `Triggered: ${context.safetyAssessment.triggers.map((trigger) => safetyTriggerLabels[trigger]).join(', ')}`
    : 'Not triggered.';

  return [
    `Memory summary:`,
    context.memorySummary || 'No saved memory yet.',
    '',
    `Safety check:`,
    safetyStatus,
    '',
    `Recent conversation messages:`,
    recentConversation,
    '',
    `Latest user message:`,
    context.latestUserMessage,
  ].join('\n');
};

export const generateAssistantReply = async (context: ChatPromptContext): Promise<string> => {
  const safetyInstruction = context.safetyAssessment.triggered
    ? 'The latest user message triggered the demo safety layer. Respond calmly and supportively, avoid diagnosis and treatment recommendations, and encourage contacting a licensed professional or emergency services if the situation sounds urgent.'
    : 'Respond with the normal supportive healthcare-adjacent behavior.';

  if (!openai) {
    if (context.safetyAssessment.triggered) {
      return [
        'I am sorry you are going through this. You deserve support, and it may help to contact a licensed professional or emergency services right away if you are in immediate danger or this feels urgent.',
        'If you can, reach out to someone nearby who can stay with you and help you get support now.',
        fallbackDisclaimer,
      ].join(' ');
    }

    return [
      'I can help you reflect on what you are experiencing and organize next steps in a supportive, non-diagnostic way.',
      'I am missing an OpenAI API key right now, so this is a fallback response rather than a model-generated one.',
      fallbackDisclaimer,
    ].join(' ');
  }

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: 'system',
        content: assistantInstructions,
      },
      {
        role: 'system',
        content:
          'Base your reply on the memory summary, the recent conversation, and the latest user message. Use the memory summary when it is relevant, but do not invent facts that are not there.',
      },
      {
        role: 'system',
        content: safetyInstruction,
      },
      {
        role: 'user',
        content: formatPromptContext(context),
      },
    ],
  });

  return response.output_text.trim() || fallbackDisclaimer;
};

export const updateMemorySummary = async (
  previousSummary: string,
  messages: ChatMessageInput[],
): Promise<string> => {
  if (!openai) {
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');

    if (!latestUserMessage) {
      return previousSummary;
    }

    return [
      previousSummary,
      `- Recent concern shared: ${latestUserMessage.content.slice(0, 140)}`,
      `- Prefers supportive, non-diagnostic guidance`,
    ]
      .filter(Boolean)
      .slice(-4)
      .join('\n');
  }

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: 'system',
        content: memoryInstructions,
      },
      {
        role: 'system',
        content:
          'Update the memory summary using the prior memory plus the full conversation below. Keep the summary stable, concise, and useful for future supportive responses.',
      },
      {
        role: 'system',
        content: `Current memory summary:\n${previousSummary || 'No saved memory yet.'}`,
      },
      {
        role: 'user',
        content: `Conversation to summarize:\n${formatConversation(messages)}`,
      },
    ],
  });

  return response.output_text.trim() || previousSummary;
};
