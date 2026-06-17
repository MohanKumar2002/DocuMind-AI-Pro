import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const LANG_INSTRUCTIONS: Record<string, string> = {
  en: 'Respond in English.',
  ta: 'Respond entirely in Tamil (தமிழ்). Even if the document is in English, answer in Tamil.',
  hi: 'Respond entirely in Hindi (हिन्दी).',
  te: 'Respond entirely in Telugu (తెలుగు).',
  de: 'Respond entirely in German (Deutsch).',
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'The GEMINI_API_KEY environment variable is missing or empty on the server.' }, { status: 500 })
    }
    const ai = new GoogleGenAI({ apiKey })

    const { message, context, language = 'en', history = [] } = await req.json()

    if (!message || !context) {
      return Response.json({ error: 'Missing message or context' }, { status: 400 })
    }

    const langInstruction = LANG_INSTRUCTIONS[language] || LANG_INSTRUCTIONS.en

    const systemPrompt = `You are DocuMind AI — an expert document analysis assistant built by MOH AI TECH (Namakkal, Tamil Nadu, India).

You have been given relevant sections from the user's document to answer their question.

RULES:
1. Answer ONLY based on the document sections provided below
2. If info isn't in the document, say "This information is not found in the document"
3. Always cite which section your answer comes from (e.g. "According to Section 2...")
4. Use **bold** for key terms, bullet points for lists
5. Be concise but thorough
6. ${langInstruction}

DOCUMENT SECTIONS:
${context}`

    const geminiHistory = history.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }))

    const chat = ai.chats.create({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      history: geminiHistory,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        maxOutputTokens: 1500,
      }
    })

    const stream = await chat.sendMessageStream({
      message: message
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const delta = chunk.text || ''
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        controller.close()
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      }
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Chat failed' }, { status: 500 })
  }
}

