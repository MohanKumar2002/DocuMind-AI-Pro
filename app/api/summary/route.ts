import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const LEVEL_PROMPTS: Record<string, string> = {
  quick: 'Write a 2-3 sentence executive summary. Be extremely concise and direct.',
  detailed: `Write a detailed summary with:
**Overview**: What this document covers (2-3 sentences)
**Key Points**: 5-7 most important points as bullet points  
**Important Data**: Key numbers, dates, statistics
**Conclusion**: Main takeaway in 1-2 sentences`,
  full: `Write a comprehensive analysis:
**Document Overview**
**Section-by-Section Analysis** (cover all major topics)
**Key Facts, Statistics & Data**
**Important Names, Dates & Entities**
**Conclusions & Recommendations**
**Action Items** (if any)`
}

export async function POST(req: NextRequest) {
  try {
    const { text, level = 'detailed', language = 'en' } = await req.json()
    if (!text) return Response.json({ error: 'No text provided' }, { status: 400 })

    const langMap: Record<string, string> = { en:'English', ta:'Tamil (தமிழ்)', hi:'Hindi (हिन्दी)', te:'Telugu (తెలుగు)', de:'German (Deutsch)' }
    const lang = langMap[language] || 'English'

    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL_FAST || 'llama-3.1-8b-instant',
      messages: [{
        role: 'user',
        content: `${LEVEL_PROMPTS[level]}\n\nRespond in ${lang}. Use markdown formatting.\n\nDocument:\n${text.slice(0, 12000)}`
      }],
      max_tokens: 2000,
      temperature: 0.2,
    })

    return Response.json({
      summary: response.choices[0].message.content,
      tokens: response.usage?.total_tokens
    })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
