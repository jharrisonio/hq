// Fixed height (not padding-derived) so the bar is pixel-identical across
// every page regardless of what's in `right` — a small filter chip and a
// bigger button used to produce visibly different header heights when the
// height came from py-3.5 + content instead of a fixed height.
export default function PageHeader({ title, left, right }) {
  return (
    <div className="flex items-center justify-between h-[52px] px-4 md:px-6 border-b border-gray-100 shrink-0">
      {left || <div className="text-[11px] font-medium uppercase tracking-widest text-black">{title}</div>}
      {right}
    </div>
  )
}
