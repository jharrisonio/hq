import { useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useContacts } from '../../hooks/useContacts'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'

export default function ContactDetail() {
  const { user } = useOutletContext()
  const { contactId } = useParams()
  const navigate = useNavigate()
  const { contacts, loading, updateContact, deleteContact } = useContacts(user?.id)
  const { showSuccess, showError } = useToast()
  const contact = contacts.find((c) => c.id === contactId)
  const [fields, setFields] = useState(null)

  if (loading) return null
  if (!contact) return <div className="p-8 text-[13px] text-gray-400">Contact not found.</div>

  const current = fields || contact

  const save = async () => {
    if (!fields) return
    try {
      await updateContact(contact.id, fields)
      setFields(null)
      showSuccess('Saved')
    } catch (err) {
      showError(err.message)
    }
  }

  const remove = async () => {
    try {
      await deleteContact(contact.id)
      navigate('/crm')
    } catch (err) {
      showError(err.message)
    }
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-8 max-w-md">
      <button onClick={() => navigate('/crm')} className="text-[11px] text-gray-400 hover:text-black mb-6 block">
        ← Back to CRM
      </button>

      <div className="flex flex-col gap-3">
        <input
          value={current.name || ''}
          onChange={(e) => setFields({ ...current, name: e.target.value })}
          className="text-[15px] font-medium border-b border-gray-200 pb-1"
        />
        <input
          type="email"
          placeholder="Email"
          value={current.email || ''}
          onChange={(e) => setFields({ ...current, email: e.target.value })}
          className="text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
        />
        <input
          type="date"
          value={current.birthday || ''}
          onChange={(e) => setFields({ ...current, birthday: e.target.value })}
          className="text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
        />
        <textarea
          placeholder="Notes"
          value={current.notes || ''}
          onChange={(e) => setFields({ ...current, notes: e.target.value })}
          rows={4}
          className="text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
        />

        <div className="flex items-center justify-between mt-2">
          <Button variant="primary" onClick={save} disabled={!fields}>
            Save
          </Button>
          <Button variant="ghost" onClick={remove}>
            Delete contact
          </Button>
        </div>
      </div>
    </div>
  )
}
