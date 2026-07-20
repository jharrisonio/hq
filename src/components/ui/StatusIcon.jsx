export default function StatusIcon({ status, type }) {
  if (type === 'question') {
    return <div className="w-2.5 h-2.5 m-[2px] shrink-0 bg-gray-600 rounded-[1px] rotate-45" />
  }

  const base = 'w-3.5 h-3.5 shrink-0'
  switch (status) {
    case 'blocked':
      return <div className={`${base} bg-black rounded-sm`} />
    case 'prepared':
      return <div className={`${base} bg-gray-500 rounded-full`} />
    case 'done':
      return <div className={`${base} bg-black rounded-full`} />
    case 'todo':
    default:
      return <div className={`${base} rounded-full border-[1.5px] border-gray-300 bg-transparent`} />
  }
}
