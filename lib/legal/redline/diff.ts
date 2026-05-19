export type OpType = 'eq' | 'ins' | 'del'

export interface Op {
  t: OpType
  v: string
}

export type SegmentType = 'equal' | 'insert' | 'delete' | 'modify'

export interface Segment {
  type: SegmentType
  oldText: string
  newText: string
}

export function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) || []
}

export function lcs(a: string[], b: string[]): Op[] | null {
  const m = a.length
  const n = b.length
  if (m * n > 800000) return null

  const dp: Int32Array[] = Array.from({ length: m + 1 }, () => new Int32Array(n + 1))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const ops: Op[] = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ t: 'eq', v: a[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ t: 'ins', v: b[j - 1] })
      j--
    } else {
      ops.push({ t: 'del', v: a[i - 1] })
      i--
    }
  }

  ops.reverse()
  return ops
}

export function buildSegments(ops: Op[]): Segment[] {
  const segments: Segment[] = []
  let i = 0

  while (i < ops.length) {
    const op = ops[i]

    if (op.t === 'eq') {
      let text = op.v
      i++
      while (i < ops.length && ops[i].t === 'eq') {
        text += ops[i].v
        i++
      }
      segments.push({ type: 'equal', oldText: text, newText: text })
      continue
    }

    if (op.t === 'del' && i + 1 < ops.length && ops[i + 1].t === 'ins') {
      let oldText = op.v
      let newText = ops[i + 1].v
      i += 2
      while (i + 1 < ops.length && ops[i].t === 'del' && ops[i + 1].t === 'ins') {
        oldText += ops[i].v
        newText += ops[i + 1].v
        i += 2
      }
      segments.push({ type: 'modify', oldText, newText })
      continue
    }

    if (op.t === 'del') {
      let oldText = op.v
      i++
      while (i < ops.length && ops[i].t === 'del') {
        oldText += ops[i].v
        i++
      }
      segments.push({ type: 'delete', oldText, newText: '' })
      continue
    }

    let newText = op.v
    i++
    while (i < ops.length && ops[i].t === 'ins') {
      newText += ops[i].v
      i++
    }
    segments.push({ type: 'insert', oldText: '', newText })
  }

  return segments
}

export function compareTexts(oldText: string, newText: string): Segment[] | null {
  const ops = lcs(tokenize(oldText), tokenize(newText))
  if (!ops) return null
  return buildSegments(ops)
}

export interface RedlineStats {
  wordsAdded: number
  wordsDeleted: number
  modifications: number
  totalChanges: number
}

export function computeStats(segments: Segment[]): RedlineStats {
  let wordsAdded = 0
  let wordsDeleted = 0
  let modifications = 0
  let totalChanges = 0

  const countWords = (s: string) => (s.match(/\S+/g) || []).length

  for (const seg of segments) {
    if (seg.type === 'insert') {
      wordsAdded += countWords(seg.newText)
      totalChanges++
    } else if (seg.type === 'delete') {
      wordsDeleted += countWords(seg.oldText)
      totalChanges++
    } else if (seg.type === 'modify') {
      wordsDeleted += countWords(seg.oldText)
      wordsAdded += countWords(seg.newText)
      modifications++
      totalChanges++
    }
  }

  return { wordsAdded, wordsDeleted, modifications, totalChanges }
}

export function formatRedlineCopy(segments: Segment[]): string {
  return segments
    .map(seg => {
      if (seg.type === 'equal') return seg.oldText
      if (seg.type === 'insert') return `[+${seg.newText.trim()}]`
      if (seg.type === 'delete') return `[-${seg.oldText.trim()}]`
      return `[-${seg.oldText.trim()}][+${seg.newText.trim()}]`
    })
    .join('')
}

/** Índices de segmentos que son cambios (para navegación) */
export function changeSegmentIndices(segments: Segment[]): number[] {
  return segments
    .map((s, i) => (s.type !== 'equal' ? i : -1))
    .filter(i => i >= 0)
}
