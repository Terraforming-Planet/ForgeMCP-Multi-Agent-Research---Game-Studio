interface Props {
  value: string
}

export function StatusBadge({ value }: Props) {
  return <span className={`badge badge-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>
}
