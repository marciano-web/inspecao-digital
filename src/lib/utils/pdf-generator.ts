import jsPDF from 'jspdf'
import type { Inspection, InspectionTemplate, TemplateSection, TemplateField, Organization, Customer, ServiceOrder, Profile, InspectionPhoto } from '@/lib/types/database'

interface GeneratePdfParams {
  org: Organization
  inspection: Inspection
  template: InspectionTemplate
  sections: (TemplateSection & { fields: TemplateField[] })[]
  responses: Record<string, unknown>
  notes: Record<string, string>
  inspector?: Profile | null
  customer?: Customer | null
  serviceOrder?: ServiceOrder | null
  photos: InspectionPhoto[]
}

async function loadImageAsBase64(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        const img = new Image()
        img.onload = () => resolve({ data: dataUrl, w: img.width, h: img.height })
        img.onerror = () => resolve(null)
        img.src = dataUrl
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function formatValue(field: TemplateField, val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  if (field.field_type === 'yes_no_na') {
    const labels = (field.config as { labels?: Record<string, string> }).labels ?? {}
    return labels[val as string] ?? String(val)
  }
  if (field.field_type === 'date' && typeof val === 'string') {
    try { return new Date(val).toLocaleDateString('pt-BR') } catch { return val }
  }
  if (field.field_type === 'datetime' && typeof val === 'string') {
    try { return new Date(val).toLocaleString('pt-BR') } catch { return val }
  }
  if (Array.isArray(val)) return val.join(', ')
  return String(val)
}

export async function generateInspectionPdf(params: GeneratePdfParams): Promise<Blob> {
  const { org, inspection, template, sections, responses, notes, inspector, customer, serviceOrder, photos } = params

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  // Load logo if exists
  let logoData: { data: string; w: number; h: number } | null = null
  if (org.logo_url) {
    logoData = await loadImageAsBase64(org.logo_url)
  }

  let y = margin

  // === HEADER ===
  const drawHeader = (pageY: number): number => {
    let cursorY = pageY

    // Logo
    if (logoData) {
      const logoH = 18
      const ratio = logoData.w / logoData.h
      const logoW = Math.min(logoH * ratio, 50)
      try {
        doc.addImage(logoData.data, 'PNG', margin, cursorY, logoW, logoH)
      } catch { /* invalid image */ }
    }

    // Company info (right of logo)
    const infoX = margin + 60
    doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(20)
    doc.text(org.name, infoX, cursorY + 4)
    doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(80)
    let infoY = cursorY + 9
    if (org.legal_name) { doc.text(org.legal_name, infoX, infoY); infoY += 3.5 }
    if (org.cnpj) { doc.text(`CNPJ: ${org.cnpj}`, infoX, infoY); infoY += 3.5 }
    if (org.address) { doc.text(org.address, infoX, infoY, { maxWidth: pageWidth - infoX - margin }); infoY += 3.5 }
    if (org.phone || org.email) {
      const contact = [org.phone, org.email].filter(Boolean).join(' • ')
      doc.text(contact, infoX, infoY); infoY += 3.5
    }

    cursorY = Math.max(cursorY + 22, infoY + 2)

    // Custom report header
    if (org.report_header) {
      doc.setFillColor(30, 64, 175) // blue
      doc.rect(margin, cursorY, contentWidth, 8, 'F')
      doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(255)
      doc.text(org.report_header, pageWidth / 2, cursorY + 5.5, { align: 'center' })
      cursorY += 10
    }

    // Separator line
    doc.setDrawColor(200).setLineWidth(0.3)
    doc.line(margin, cursorY, pageWidth - margin, cursorY)
    cursorY += 4

    return cursorY
  }

  const drawFooter = () => {
    const footerY = pageHeight - 10
    doc.setDrawColor(200).setLineWidth(0.3)
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

    doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(120)
    if (org.report_footer) {
      doc.text(org.report_footer, pageWidth / 2, footerY - 1, { align: 'center', maxWidth: contentWidth })
    }
    const pageNum = doc.getCurrentPageInfo().pageNumber
    const totalPages = doc.getNumberOfPages()
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, footerY + 3, { align: 'right' })
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, footerY + 3)
  }

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 25) {
      drawFooter()
      doc.addPage()
      y = margin
      y = drawHeader(y)
    }
  }

  y = drawHeader(y)

  // === TITLE ===
  doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(20)
  doc.text(template.title, margin, y + 5)
  y += 8

  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80)
  doc.text(inspection.title, margin, y + 4)
  y += 8

  // === META INFO BOX ===
  const metaItems: Array<[string, string]> = []
  if (customer) {
    metaItems.push(['Cliente', customer.name])
    if (customer.cnpj) metaItems.push(['CNPJ Cliente', customer.cnpj])
  }
  if (serviceOrder) metaItems.push(['Ordem de Serviço', `OS ${serviceOrder.order_number}`])
  if (inspector) metaItems.push(['Inspetor', inspector.full_name])
  if (inspection.location) metaItems.push(['Local', inspection.location])
  if (inspection.completed_at) metaItems.push(['Data de Conclusão', new Date(inspection.completed_at).toLocaleString('pt-BR')])
  if (inspection.score_percentage !== null) {
    metaItems.push(['Nota', `${inspection.score_percentage}% ${inspection.passed ? '(APROVADO)' : '(REPROVADO)'}`])
  }

  if (metaItems.length > 0) {
    const boxH = Math.ceil(metaItems.length / 2) * 6 + 4
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, 'FD')

    doc.setFontSize(8)
    metaItems.forEach((item, idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const x = margin + 3 + col * (contentWidth / 2)
      const ly = y + 6 + row * 6
      doc.setFont('helvetica', 'bold').setTextColor(80)
      doc.text(item[0] + ':', x, ly)
      doc.setFont('helvetica', 'normal').setTextColor(20)
      doc.text(item[1], x + 30, ly)
    })
    y += boxH + 6
  }

  // === SECTIONS AND RESPONSES ===
  for (const section of sections) {
    ensureSpace(15)

    // Section title bar
    doc.setFillColor(30, 64, 175)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(255)
    doc.text(section.title, margin + 2, y + 5)
    y += 9

    if (section.description) {
      doc.setFontSize(8).setFont('helvetica', 'italic').setTextColor(100)
      const descLines = doc.splitTextToSize(section.description, contentWidth)
      doc.text(descLines, margin, y)
      y += descLines.length * 3.5 + 2
    }

    // Fields
    for (const field of section.fields) {
      const val = responses[field.id]
      const formatted = formatValue(field, val)
      const note = notes[field.id]

      const labelLines = doc.splitTextToSize(field.label, contentWidth - 40)
      const valLines = doc.splitTextToSize(formatted, contentWidth - 5)
      const noteLines = note ? doc.splitTextToSize(`Obs: ${note}`, contentWidth - 5) : []

      const itemH = labelLines.length * 4 + valLines.length * 4 + noteLines.length * 3.5 + 4

      ensureSpace(itemH)

      // Label
      doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(40)
      doc.text(labelLines, margin, y)
      y += labelLines.length * 4

      // Value with status indicator
      let valueColor: [number, number, number] = [20, 20, 20]
      if (field.field_type === 'yes_no_na') {
        if (val === 'yes') valueColor = [22, 163, 74]
        else if (val === 'no') valueColor = [220, 38, 38]
      }
      doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(...valueColor)
      doc.text(valLines, margin + 3, y + 1)
      y += valLines.length * 4

      // Note
      if (noteLines.length > 0) {
        doc.setFontSize(8).setFont('helvetica', 'italic').setTextColor(217, 119, 6)
        doc.text(noteLines, margin + 3, y)
        y += noteLines.length * 3.5
      }

      y += 2
    }

    y += 4
  }

  // === PHOTOS PAGE ===
  if (photos.length > 0) {
    doc.addPage()
    y = margin
    y = drawHeader(y)

    doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(20)
    doc.text('Anexos / Evidências', margin, y + 4)
    y += 10

    const cols = 2
    const gap = 6
    const cellW = (contentWidth - gap * (cols - 1)) / cols
    const cellH = cellW * 0.75

    let col = 0
    for (const photo of photos) {
      const photoData = await loadImageAsBase64(photo.storage_path.startsWith('http') ? photo.storage_path :
        // Build public URL if storage_path is a relative path
        `https://axcwytlvmmodqaukhpqx.supabase.co/storage/v1/object/public/inspection-photos/${photo.storage_path}`)

      if (!photoData) continue

      ensureSpace(cellH + 8)

      const x = margin + col * (cellW + gap)
      try {
        doc.addImage(photoData.data, 'JPEG', x, y, cellW, cellH)
        doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(100)
        doc.text(photo.file_name, x, y + cellH + 4, { maxWidth: cellW })
      } catch { /* skip */ }

      col++
      if (col >= cols) {
        col = 0
        y += cellH + 8
      }
    }
  }

  // === FINAL FOOTER ON ALL PAGES ===
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter()
  }

  return doc.output('blob')
}
