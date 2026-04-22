import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'

const app = express()
app.use(express.json())

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-opus-4-6'

const SYSTEM_PROMPT = `You are a content writer for LI.FI, a cross-chain infrastructure protocol that aggregates bridges, DEXs, and solvers to power seamless multi-chain transactions.

You write short-form knowledge hub articles (300–500 words) modeled on LI.FI's published content style. These are concise announcements — partner integrations, protocol upgrades, or feature launches.

## Structure
1. **Title** — descriptive, may include "Powered by LI.FI" or the partner name
2. **Opening paragraph** — 1–2 sentences stating exactly what happened and why it matters
3. **Key details** — 3–6 bullet points covering features, performance improvements, or supported infrastructure
4. **Business context** — 1 short paragraph with concrete metrics (volume processed, wallets served, chains supported) to anchor credibility
5. **Call to action** — 1–3 links (try it, integrate, learn more)

## Voice & Style
- Professional but accessible — no hype words ("revolutionary", "game-changing"), no exclamation marks
- Lead with user/developer benefit, not company self-congratulation
- Use concrete numbers: "$16B cumulative volume", "60+ chains", "20+ vault protocols"
- Emphasize simplicity: "one-click", "single transaction", "single API integration"
- Short paragraphs (2–3 sentences max). Bullet points for specs.
- Reference the multi-chain narrative naturally — fragmentation is the problem, LI.FI is the infrastructure solving it
- Name specific protocols, chains, and products — never speak in vague generalities
- No emojis. No rhetorical questions. No "In the ever-evolving world of DeFi" style openings.

## Rules
- Never fabricate statistics — only use data from the provided context
- If you don't have a metric, omit the claim rather than inventing one
- Always reflect the tone specified (professional / casual / technical)
- Return only the article text in markdown. No meta-explanations.`

const ARTICLE_SYSTEM_PROMPT = `You are a content writer for LI.FI, a cross-chain infrastructure protocol that aggregates bridges, DEXs, and solvers to power seamless multi-chain transactions.

You write long-form knowledge hub articles (800–1200 words) modeled on LI.FI's published content style. These are in-depth pieces covering product launches, deep-dive integrations, or ecosystem narratives.

## Structure
1. **Title** — descriptive and specific (e.g., "Institutional-Grade Yield on Solana, From Any Chain — Powered by LI.FI")
2. **TL;DR / Opening summary** — 2–3 sentences capturing the full announcement so a skimmer gets the point
3. **The Problem** — what friction or fragmentation exists today that this solves (1–2 paragraphs)
4. **The Solution** — what was built or integrated and how it works at a high level (2–3 paragraphs)
5. **How It Works** — step-by-step user flow or technical breakdown with specifics (numbered list or short paragraphs)
6. **Why This Matters** — ecosystem impact, addressable market expansion, multi-chain thesis (1–2 paragraphs)
7. **Call to Action** — links to try the product, read docs, or contact for integration
8. **Disclaimer** (if applicable) — brief note that content is informational, not financial advice

## Voice & Style
- Professional but accessible — no hype words ("revolutionary", "game-changing"), no exclamation marks
- Lead with user/developer benefit, not company self-congratulation
- Use concrete numbers: "$16B cumulative volume", "60+ chains", "20+ vault protocols"
- Emphasize simplicity: "one-click", "single transaction", "single API integration"
- Short paragraphs (2–3 sentences max). Bullet points for specs and features.
- Reference the multi-chain narrative naturally — fragmentation is the problem, LI.FI is the infrastructure solving it
- Name specific protocols, chains, and products — never speak in vague generalities
- Section headers should be descriptive, not clever (prefer "What Users Can Do" over "Unleashing the Power")
- No emojis. No rhetorical questions. No "In the ever-evolving world of DeFi" style openings.

## Rules
- Never fabricate statistics — only use data from the provided context
- If you don't have a metric, omit the claim rather than inventing one
- Always reflect the tone specified (professional / casual / technical)
- Return only the article text in markdown with proper heading hierarchy (# for title, ## for sections). No meta-explanations.`

const INSIGHTS_SYSTEM_PROMPT = `You are a data analyst for LI.FI, a cross-chain infrastructure protocol.
Analyze protocol data and identify compelling insights for LinkedIn content creation.
Focus on trends, milestones, comparisons, and narratives that would resonate with a professional audience.
Return ONLY valid JSON with no additional text or markdown formatting.`

const CHAT_SYSTEM_PROMPT = `You are a data analyst for LI.FI, a cross-chain infrastructure protocol.
You're discussing data insights with a colleague who wants to create LinkedIn content.
Help them understand the data, provide additional context, suggest content angles, and answer questions.
Be concise and data-driven in your responses.
You have access to the full protocol data — use it to answer questions beyond the specific insight shown.
Do NOT use markdown formatting in your replies. No bold (**), no headers (#), no bullet markers (* or -). Write in plain text with natural paragraphs.`

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional:
    'Write in a professional B2B tone aimed at fintech product managers and business development leads. Lead with the integration\'s business value — expanded addressable market, new revenue streams, reduced integration complexity. Use precise metrics. Avoid jargon that only developers would understand.',
  casual:
    'Write in a conversational, community-focused tone aimed at the broader crypto-native audience. Be direct and relatable — explain what users can now do that they couldn\'t before. Keep it tight and scannable. Light informality is fine, but no hype.',
  technical:
    'Write for a developer and protocol engineering audience. Be precise about architecture: intent-based systems, cross-chain routing, vault aggregation, transaction orchestration. Reference specific protocols, APIs, and SDKs. Focus on what developers can build with this.',
}

const ARTICLE_TONE_INSTRUCTIONS: Record<string, string> = {
  professional:
    'Write a LinkedIn article in a professional B2B tone. Frame the narrative around market opportunity and business impact. Include a title (prefixed with #), structured sections (prefixed with ##), concrete metrics, and clear CTAs. Aimed at product leaders, BD teams, and institutional readers. Aim for 800-1200 words.',
  casual:
    'Write a LinkedIn article in a conversational tone. Frame the narrative around what real users can now do. Include a title (prefixed with #), clear sections (prefixed with ##), and an engaging flow that explains the problem, solution, and impact without sounding like a press release. Aim for 800-1200 words.',
  technical:
    'Write a LinkedIn article for a developer audience. Include a title (prefixed with #), technical sections (prefixed with ##) covering architecture, protocol mechanics, and integration details. Reference APIs, SDKs, smart contract interactions, and cross-chain execution flows. Include practical "how it works" steps. Aim for 800-1200 words.',
}

function buildUserPrompt(
  contexts: string[],
  data: Record<string, unknown>,
  tone: string,
  contentType: string = 'post',
  feedback?: string,
): string {
  const hasDiscussion = contexts.some((c) => c.includes('Discussion notes:'))

  let prompt = `Context about what's happening at LI.FI:\n${contexts.join('\n\n')}\n\n`

  if (hasDiscussion) {
    prompt += `IMPORTANT: Some insights above include "Discussion notes" from a conversation with an analyst. Use those discussion points — angles, questions raised, clarifications, and suggestions — to shape the narrative and depth of the content.\n\n`
  }

  if (Object.keys(data).length > 0) {
    prompt += `Live data to reference:\n${JSON.stringify(data, null, 2)}\n\n`
  }

  if (contentType === 'article') {
    prompt += `Write a LinkedIn article in ${tone} tone.\n`
    prompt += (ARTICLE_TONE_INSTRUCTIONS[tone] || '') + '\n'
  } else {
    prompt += `Write a LinkedIn post in ${tone} tone.\n`
    prompt += (TONE_INSTRUCTIONS[tone] || '') + '\n'
  }

  if (feedback) {
    prompt += `\nAdditional instruction: ${feedback}\n`
  }

  prompt +=
    contentType === 'article'
      ? '\nReturn only the article text with markdown formatting. No meta-explanations.'
      : '\nReturn only the post text. No explanations.'

  return prompt
}

app.post('/api/generate', async (req, res) => {
  const { contexts, data, tone, contentType = 'post', feedback } = req.body

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()

  try {
    const systemPrompt = contentType === 'article' ? ARTICLE_SYSTEM_PROMPT : SYSTEM_PROMPT
    const maxTokens = contentType === 'article' ? 4096 : 1024

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: buildUserPrompt(contexts, data, tone, contentType, feedback) },
      ],
    })

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`)
    })

    await stream.finalMessage()

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Generation error:', message)
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
    res.end()
  }
})

app.post('/api/generate-insights', async (req, res) => {
  const { data, existingTitles = [], categories } = req.body

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()

  try {
    const excludeBlock =
      existingTitles.length > 0
        ? `\n\nIMPORTANT: The following insights have already been generated. Do NOT repeat them or produce similar ones. Find completely different angles, metrics, and narratives:\n${existingTitles.map((t: string) => `- "${t}"`).join('\n')}\n`
        : ''

    const categoryBlock =
      Array.isArray(categories) && categories.length > 0
        ? `\n\nIMPORTANT: Only generate insights in these categories: ${categories.map((c: string) => `"${c}"`).join(', ')}. Every insight MUST belong to one of these categories.\n`
        : ''

    const prompt = `Analyze this LI.FI protocol data snapshot and generate exactly 6 key insights for LinkedIn content creation.

Data:
${JSON.stringify(data, null, 2)}
${excludeBlock}${categoryBlock}
Return a JSON array where each insight has these exact fields:
- "id": unique kebab-case string
- "title": short compelling title (under 60 chars)
- "description": 2-3 sentence analysis of what this data means and why it matters
- "category": one of "growth", "volume", "revenue", "adoption", "technical", "ecosystem"
- "metric": the key metric value as a formatted string (e.g., "$2.79B", "8M+", "67 chains")
- "trend": "up", "down", or "neutral"
- "trendValue": change description (e.g., "+2.9%", "-23.9%", "Stable")
- "dataPoints": array of 2-4 supporting data strings

Focus on finding fresh, unique angles. Dig into comparisons, ratios, outliers, and narratives not covered by any existing insights.

Return ONLY the JSON array, no other text.`

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: INSIGHTS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    let buffer = ''
    let depth = 0
    let inString = false
    let escaped = false
    let insightStart = -1

    stream.on('text', (text) => {
      for (const char of text) {
        buffer += char

        if (escaped) {
          escaped = false
          continue
        }
        if (char === '\\' && inString) {
          escaped = true
          continue
        }
        if (char === '"') {
          inString = !inString
          continue
        }
        if (inString) continue

        if (char === '{') {
          if (depth === 0) insightStart = buffer.length - 1
          depth++
        } else if (char === '}') {
          depth--
          if (depth === 0 && insightStart !== -1) {
            const objStr = buffer.slice(insightStart)
            try {
              const insight = JSON.parse(objStr)
              res.write(`data: ${JSON.stringify({ insight })}\n\n`)
            } catch {
              // incomplete parse, skip
            }
            insightStart = -1
          }
        }
      }
    })

    await stream.finalMessage()

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Insights generation error:', message)
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
    res.end()
  }
})

app.post('/api/chat-insight', async (req, res) => {
  const { insight, messages, data } = req.body

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()

  try {
    const contextMessage = `I want to discuss this data insight about LI.FI:

Title: ${insight.title}
Category: ${insight.category}
Key Metric: ${insight.metric} (${insight.trendValue})
Description: ${insight.description}
Supporting Data: ${insight.dataPoints.join('; ')}

Full protocol data for reference:
${JSON.stringify(data, null, 2)}`

    const claudeMessages: Anthropic.MessageParam[] = [
      { role: 'user', content: contextMessage },
      {
        role: 'assistant',
        content: `I'd be happy to discuss this insight about "${insight.title}". What would you like to know?`,
      },
      ...messages.map((m: { role: string; content: string }) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      system: CHAT_SYSTEM_PROMPT,
      messages: claudeMessages,
    })

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`)
    })

    await stream.finalMessage()

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Chat error:', message)
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
    res.end()
  }
})

const __dirname = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_PATH = join(__dirname, '..', 'data', 'snapshot.json')

app.get('/api/lifi-data', (_req, res) => {
  try {
    const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8'))
    res.json(snapshot)
  } catch (error) {
    console.error('Failed to read snapshot.json:', error)
    res.status(500).json({ error: 'snapshot.json not found or invalid' })
  }
})

const ANALYSIS_PATH = join(__dirname, '..', 'data', 'analysis.json')

app.get('/api/insights', (_req, res) => {
  try {
    const insights = JSON.parse(readFileSync(ANALYSIS_PATH, 'utf-8'))
    res.json({ insights })
  } catch (error) {
    console.error('Failed to read analysis.json:', error)
    res.status(500).json({ error: 'analysis.json not found or invalid' })
  }
})

const MOCK_POSTS_PATH = join(__dirname, '..', 'data', 'mock-posts.json')

app.get('/api/examples', (_req, res) => {
  try {
    const data = JSON.parse(readFileSync(MOCK_POSTS_PATH, 'utf-8'))
    res.json(data.examples)
  } catch (error) {
    console.error('Failed to read mock-posts.json:', error)
    res.status(500).json({ error: 'mock-posts.json not found or invalid' })
  }
})

const PORT = process.env.API_PORT || 3001
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
