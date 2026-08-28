import { BadRequestException, HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';

type LiveTutorInput = { grade?: unknown; medium?: unknown; topic?: unknown; question?: unknown };

@Injectable()
export class TavusTutorService {
  async createConversation(input: LiveTutorInput) {
    const apiKey = process.env.TAVUS_API_KEY?.trim();
    const palId = process.env.TAVUS_PAL_ID?.trim();
    if (!apiKey || !palId) {
      throw new ServiceUnavailableException('Live AI Teacher is not configured. Add TAVUS_API_KEY and TAVUS_PAL_ID to the backend environment.');
    }

    const grade = Number(input.grade ?? 6);
    const medium = this.normalizeMedium(input.medium);
    const topic = String(input.topic ?? 'school Mathematics').trim().slice(0, 120);
    const question = String(input.question ?? '').trim().slice(0, 2000);
    const languageInstruction = `Conduct the entire conversation in ${medium}, including the greeting, explanations, questions, examples, and corrections. Do not switch to English unless the student explicitly asks for English.`;
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        pal_id: palId,
        conversation_name: `Maths Lanka Grade ${grade} ${medium} lesson`,
        conversational_context: `You are a professional, patient human-like Mathematics teacher for a Sri Lankan Grade ${grade} student. ${languageInstruction} Focus on ${topic}. Explain the relevant theory behind the student's question first, then solve it step by step with age-appropriate examples. Ask short check-in questions, encourage the student, listen carefully, allow interruptions, and correct mistakes gently. Start the lesson by addressing this student prompt: ${question || 'Please ask the student what Mathematics topic they would like to learn.'}`,
        properties: { max_call_duration: 1800, participant_absent_timeout: 120 },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 402) {
        throw new HttpException('Live AI Teacher is unavailable because the Tavus account needs billing or conversation credits.', HttpStatus.PAYMENT_REQUIRED);
      }
      const status = response.status === 429 ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.BAD_GATEWAY;
      throw new HttpException(`Live AI Teacher could not start (${response.status}). ${detail.slice(0, 240)}`, status);
    }

    const payload = await response.json() as { conversation_id?: string; conversation_url?: string; status?: string };
    if (!payload.conversation_url) {
      throw new HttpException('Tavus did not return a conversation URL.', HttpStatus.BAD_GATEWAY);
    }

    return {
      conversationId: payload.conversation_id ?? null,
      conversationUrl: payload.conversation_url,
      status: payload.status ?? 'active',
      medium,
    };
  }

  private normalizeMedium(value: unknown): 'Sinhala' | 'English' | 'Tamil' {
    const medium = String(value ?? 'English').trim().toLowerCase();
    if (medium === 'sinhala') return 'Sinhala';
    if (medium === 'tamil') return 'Tamil';
    return 'English';
  }
}
