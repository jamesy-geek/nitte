import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { message } = req.body

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: `You are CityMind, an AI assistant for Karnataka's urban digital twin platform (MUIP). 
You help citizens and officials understand urban issues, traffic, civic services, and emergencies across Karnataka's 31 districts.
Be concise, helpful, and specific to Karnataka context. Keep responses under 3 sentences.`,
        messages: [{ role: 'user', content: message }],
      }),
    })
    const data = await response.json()
    const reply = data.content?.[0]?.text || 'Sorry, I could not respond right now.'
    res.json({ reply })
  } catch {
    res.json({ reply: 'CityMind is temporarily unavailable. Please try again.' })
  }
}
