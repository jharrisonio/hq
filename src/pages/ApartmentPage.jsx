import PageHeader from '../components/layout/PageHeader'

export default function ApartmentPage() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Apartment" />
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-300">
        <p className="text-[12px] tracking-wider uppercase">Coming soon</p>
      </div>
    </div>
  )
}
