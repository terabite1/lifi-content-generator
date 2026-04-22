# Dr. Frankenstein

Dr. Frankenstein helps people find insights from LI.FI's monster product suite and data pipelines.

It unifies LI.FI's data — today scattered across dashboards and pipelines — and surfaces insights that can be used for marketing, BD, and business intelligence. These insights can be combined and transformed into articles or Twitter and LinkedIn posts to drive attention to the company and strengthen SEO and GEO footprint.

In the status quo, uncovering a single insight typically takes someone 1-2 hours of digging through preset charts or wrestling with fragmented data pipelines, and even then, the quality of the insight depends heavily on the individual's expertise and context, since connecting the dots across disparate sources is genuinely hard.

With Dr. Frankenstein, the dynamic flips and the insights come to you. From there, users can dig deeper into any insight through a chat interface, layering on context and sharpening their understanding of what's actually happening at LI.FI — all from a data-first perspective.

## How it works

1. **Data snapshot** — SQL queries run against LI.FI's Snowflake warehouse and produce a JSON snapshot covering platform KPIs, chain volumes, partner stats, token flows, and more.
2. **Insight generation** — Claude analyzes the snapshot and streams back categorized insights (growth, volume, revenue, adoption, technical, ecosystem) with supporting metrics and data points.
3. **Insight chat** — Users can open a conversational thread on any insight to dig deeper, ask follow-up questions, and refine their understanding before creating content.
4. **Content creation** — Select one or more insights, pick a format (short post or long-form article) and tone (professional, casual, technical), and generate publication-ready content. Chat context can be included to shape the output.
5. **Edit and save** — Generated content can be edited inline, regenerated with feedback, previewed, and saved locally for later use.

## Tech stack

- **Frontend** — React 18, TypeScript, Tailwind CSS, Vite
- **Backend** — Express server with streaming SSE endpoints
- **AI** — Anthropic Claude API (claude-opus-4-6) for insight generation, chat, and content writing

## Setup

```bash
git clone https://github.com/effie-ms/lifi-content-generator.git
cd lifi-content-generator
npm install
```

Create a `.env` file in the project root:

```
LIFI_API_BASE_URL=https://li.quest/v1
ANTHROPIC_API_KEY=your-api-key-here
```

## Running

```bash
npm run dev
```

This starts both the Express API server (port 3001) and the Vite dev server concurrently. Open the URL shown in the terminal.

## Data

The `data/` directory contains:

- `queries.sql` — Snowflake queries that produce the data snapshot
- `snapshot.json` — Latest data snapshot used by the app
- `analysis.json` — Pre-computed insights for the examples flow
- `mock-posts.json` — Example posts used for the demo mode
