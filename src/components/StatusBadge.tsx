interface Props {
  value: string
}

export function StatusBadge({ value }: Props) {
  const normalized = value.toLowerCase()
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const tone = /(fail|error|not.connected|locked)/.test(normalized)
    ? 'negative'
    : /(warning|incomplete|insufficient|hypothesis|anomaly|preliminary|await|candidate|missing|context|draft|not.sent|required)/.test(normalized)
      ? 'warning'
      : /(pass|connected|ready|observation|verified)/.test(normalized)
        ? 'positive'
        : 'neutral'
  return <span className={`badge badge-tone-${tone} badge-${slug}`}>{value}</span>
}
