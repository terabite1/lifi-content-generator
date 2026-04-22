import { type ReactNode, useMemo } from 'react'

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let key = 0

  for (let match = regex.exec(text); match !== null; match = regex.exec(text)) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <strong key={key++} className="font-semibold">
        {match[1]}
      </strong>,
    )
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

function Cursor() {
  return <span className="inline-block w-1.5 h-4 bg-lifi-600 animate-pulse ml-0.5 align-middle" />
}

export function FormattedContent({ content, showCursor }: { content: string; showCursor?: boolean }) {
  const elements = useMemo(() => {
    const lines = content.split('\n')
    const result: ReactNode[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const isLast = i === lines.length - 1
      const cursor = isLast && showCursor ? <Cursor /> : null

      if (line.startsWith('### ')) {
        result.push(
          <h4 key={i} className="text-sm font-bold text-gray-900 mt-3 mb-1">
            {renderInline(line.slice(4))}
            {cursor}
          </h4>,
        )
      } else if (line.startsWith('## ')) {
        result.push(
          <h3 key={i} className="text-base font-bold text-gray-900 mt-4 mb-1">
            {renderInline(line.slice(3))}
            {cursor}
          </h3>,
        )
      } else if (line.startsWith('# ')) {
        result.push(
          <h2 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-2">
            {renderInline(line.slice(2))}
            {cursor}
          </h2>,
        )
      } else if (/^[-*] /.test(line)) {
        result.push(
          <div key={i} className="flex gap-2 ml-2 my-0.5">
            <span className="text-gray-400 flex-shrink-0">•</span>
            <span>
              {renderInline(line.slice(2))}
              {cursor}
            </span>
          </div>,
        )
      } else if (/^\d+\.\s/.test(line)) {
        const numMatch = line.match(/^(\d+)\.\s(.*)/)
        if (numMatch) {
          result.push(
            <div key={i} className="flex gap-2 ml-2 my-0.5">
              <span className="text-gray-500 flex-shrink-0 tabular-nums">{numMatch[1]}.</span>
              <span>
                {renderInline(numMatch[2])}
                {cursor}
              </span>
            </div>,
          )
        }
      } else if (line.trim() === '') {
        result.push(<div key={i} className="h-3" />)
      } else {
        result.push(
          <p key={i} className="leading-relaxed">
            {renderInline(line)}
            {cursor}
          </p>,
        )
      }
    }

    return result
  }, [content, showCursor])

  return <>{elements}</>
}
