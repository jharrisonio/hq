import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useContacts } from '../../hooks/useContacts'
import Button from '../../components/ui/Button'

export default function CRMPage() {
  const { user } = useOutletContext()
  const { contacts, loading, addContact } = useContacts(user?.id)
  const [name, setName] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await addContact({ name: name.trim() })
    setName('')
  }

  if (loading) return null

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="text-[11px] font-medium uppercase tracking-widest text-black mb-6">CRM</div>

      <form onSubmit={submit} className="flex gap-2 mb-6 max-w-md">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a contact…"
          className="flex-1 text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
        />
        <Button type="submit" variant="secondary">
          Add
        </Button>
      </form>

      <div className="flex flex-col max-w-md">
        {contacts.map((c) => (
          <Link
            key={c.id}
            to={`/crm/${c.id}`}
            className="flex items-center justify-between py-2.5 border-b border-gray-100 hover:bg-gray-50 px-1 -mx-1"
          >
            <span className="text-[13px]">{c.name}</span>
            {c.birthday && <span className="text-[11px] text-gray-400">{c.birthday}</span>}
          </Link>
        ))}
        {contacts.length === 0 && <p className="text-[12px] text-gray-300">No contacts yet.</p>}
      </div>
    </div>
  )
}
