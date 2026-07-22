// CIBC's CSV export has no header row: Date, Description, Debit, Credit,
// masked card number. Debit = a charge (spend); Credit = a statement
// payment or refund — only debits are tracked, so credit-only rows are
// skipped entirely rather than imported as negative amounts.

function parseCsvRows(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export function parseCibcCsv(text) {
  const rows = parseCsvRows(text)
  const transactions = []

  for (const fields of rows) {
    if (fields.length < 4) continue
    const [dateStr, description, debitStr] = fields
    const debit = parseFloat(debitStr)
    if (Number.isNaN(debit) || !dateStr.trim() || !description.trim()) continue

    transactions.push({
      txn_date: dateStr.trim(),
      description: description.trim(),
      amount: debit,
      raw_row: fields,
    })
  }

  return transactions
}
