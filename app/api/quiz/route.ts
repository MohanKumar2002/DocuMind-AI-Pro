import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'The GEMINI_API_KEY environment variable is missing or empty on the server.' }, { status: 500 })
    }
    const ai = new GoogleGenAI({ apiKey })

    const { text, count = 10, type = 'mcq', difficulty = 'medium', language = 'en' } = await req.json()
    if (!text) return Response.json({ error: 'No text provided' }, { status: 400 })

    const langMap: Record<string,string> = { en:'English', ta:'Tamil', hi:'Hindi', te:'Telugu', de:'German' }
    const lang = langMap[language] || 'English'

    const typeInstructions: Record<string,string> = {
      mcq: 'multiple choice questions with 4 options (A,B,C,D). answer is 0-3 index.',
      truefalse: 'true/false questions. options are ["True","False"]. answer is 0 for True, 1 for False.',
      mixed: 'mix of multiple choice (70%) and true/false (30%).'
    }

    const prompt = `Generate exactly ${count} ${typeInstructions[type]} Difficulty: ${difficulty}. Language: ${lang}.

Return ONLY valid JSON array, no markdown, no explanation:
[{"q":"Question","options":["A) opt","B) opt","C) opt","D) opt"],"answer":0,"explanation":"Why correct"}]

Document:
${text.slice(0, 20000)}`

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL_FAST || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 3000,
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    })

    let raw = response.text || '[]'
    raw = raw.replace(/```json|```/g, '').trim()
    const match = raw.match(/\[[\s\S]*\]/)
    const questions = match ? JSON.parse(match[0]) : []

    return Response.json({ questions, count: questions.length })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
