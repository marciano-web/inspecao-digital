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
  publicBucketUrl: string // e.g. https://xxx.supabase.co/storage/v1/object/public/inspection-photos
}

async function loadImageAsBase64(url: string): Promise<{ data: string; w: number; h: number; format: string } | null> {
  return await new Promise(async (resolve) => {
    const hardTimeout = setTimeout(() => {
      console.warn('[PDF] Image load timeout:', url)
      resolve(null)
    }, 10000)

    try {
      const response = await fetch(url, { mode: 'cors' })
      if (!response.ok) {
        clearTimeout(hardTimeout)
        return resolve(null)
      }
      const blob = await response.blob()

      if (blob.type.includes('heic') || blob.type.includes('heif')) {
        clearTimeout(hardTimeout)
        console.warn('[PDF] HEIC not supported:', url)
        return resolve(null)
      }

      // Use createImageBitmap with EXIF auto-rotate (corrects phone-portrait photos)
      try {
        const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close?.()
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        clearTimeout(hardTimeout)
        return resolve({ data: dataUrl, w: canvas.width, h: canvas.height, format: 'JPEG' })
      } catch (bmErr) {
        console.warn('[PDF] createImageBitmap failed, fallback to FileReader', bmErr)
      }

      // Fallback for browsers without createImageBitmap support
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        const img = new Image()
        img.onload = () => {
          clearTimeout(hardTimeout)
          const format = blob.type.includes('png') ? 'PNG' : blob.type.includes('webp') ? 'WEBP' : 'JPEG'
          resolve({ data: dataUrl, w: img.width, h: img.height, format })
        }
        img.onerror = () => { clearTimeout(hardTimeout); resolve(null) }
        img.src = dataUrl
      }
      reader.onerror = () => { clearTimeout(hardTimeout); resolve(null) }
      reader.readAsDataURL(blob)
    } catch (e) {
      clearTimeout(hardTimeout)
      console.warn('[PDF] Image load error:', e)
      resolve(null)
    }
  })
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
  const {
    org, inspection, template, sections, responses, notes, inspector,
    customer, serviceOrder, photos, publicBucketUrl,
  } = params

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  console.log('[PDF] Starting generation. Sections:', sections.length, 'Photos:', photos.length)

  // Pre-load ALL images in parallel (logo + all photos)
  const photoUrlMap = new Map<string, { data: string; w: number; h: number; format: string } | null>()
  const allPhotoUrls = photos
    .filter(p => !p.mime_type?.startsWith('video/'))
    .map(p => ({ id: p.id, url: p.storage_path.startsWith('http') ? p.storage_path : `${publicBucketUrl}/${p.storage_path}` }))

  console.log('[PDF] Pre-loading', allPhotoUrls.length, 'photos in parallel...')
  const t0 = Date.now()

  const [logoData, ...photoResults] = await Promise.all([
    org.logo_url ? loadImageAsBase64(org.logo_url) : Promise.resolve(null),
    ...allPhotoUrls.map(p => loadImageAsBase64(p.url)),
  ])

  allPhotoUrls.forEach((p, idx) => photoUrlMap.set(p.id, photoResults[idx]))
  console.log('[PDF] Photos loaded in', Date.now() - t0, 'ms. Generating pages...')

  const drawHeader = (subtitle?: string) => {
    let y = margin

    // Logo (top-left)
    if (logoData) {
      const logoH = 16
      const ratio = logoData.w / logoData.h
      const logoW = Math.min(logoH * ratio, 45)
      try {
        doc.addImage(logoData.data, logoData.format, margin, y, logoW, logoH)
      } catch { /* skip */ }
    }

    // Company info (right of logo)
    const infoX = margin + 50
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(20)
    doc.text(org.name, infoX, y + 4)
    doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(80)
    let infoY = y + 8
    if (org.legal_name) { doc.text(org.legal_name, infoX, infoY); infoY += 3 }
    if (org.cnpj) { doc.text(`CNPJ: ${org.cnpj}`, infoX, infoY); infoY += 3 }
    if (org.address) {
      const lines = doc.splitTextToSize(org.address, pageWidth - infoX - margin)
      doc.text(lines, infoX, infoY); infoY += lines.length * 3
    }

    y = Math.max(y + 18, infoY + 1)

    // Custom report header banner
    if (org.report_header) {
      doc.setFillColor(30, 64, 175)
      doc.rect(margin, y, contentWidth, 7, 'F')
      doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(255)
      doc.text(org.report_header, pageWidth / 2, y + 4.8, { align: 'center' })
      y += 9
    }

    // Subtitle (e.g. inspection title or "continuação")
    if (subtitle) {
      doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(80)
      doc.text(subtitle, margin, y + 3)
      y += 5
    }

    // Separator
    doc.setDrawColor(30, 64, 175).setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 4

    return y
  }

  const drawFooter = () => {
    const footerY = pageHeight - 10
    doc.setDrawColor(200).setLineWidth(0.3)
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)

    doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(120)
    if (org.report_footer) {
      doc.text(org.report_footer, pageWidth / 2, footerY - 1, { align: 'center', maxWidth: contentWidth })
    }
    const pageNum = doc.getCurrentPageInfo().pageNumber
    doc.text(`Página ${pageNum}`, pageWidth - margin, footerY + 3, { align: 'right' })
    doc.text(new Date().toLocaleString('pt-BR'), margin, footerY + 3)
  }

  // ============ COVER PAGE ============
  let y = drawHeader()

  doc.setFontSize(18).setFont('helvetica', 'bold').setTextColor(20)
  const titleLines = doc.splitTextToSize(template.title, contentWidth)
  doc.text(titleLines, pageWidth / 2, y + 8, { align: 'center' })
  y += titleLines.length * 7 + 5

  doc.setFontSize(11).setFont('helvetica', 'normal').setTextColor(100)
  doc.text(inspection.title, pageWidth / 2, y, { align: 'center', maxWidth: contentWidth })
  y += 12

  // Big info box
  const metaItems: Array<[string, string]> = []
  if (customer) {
    metaItems.push(['Cliente', customer.name])
    if (customer.legal_name) metaItems.push(['Razão Social Cliente', customer.legal_name])
    if (customer.cnpj) metaItems.push(['CNPJ Cliente', customer.cnpj])
  }
  if (serviceOrder) metaItems.push(['Ordem de Serviço', `OS ${serviceOrder.order_number}`])
  if (inspector) metaItems.push(['Inspetor Responsável', inspector.full_name])
  if (inspection.location) metaItems.push(['Local', inspection.location])
  if (inspection.completed_at) metaItems.push(['Data de Conclusão', new Date(inspection.completed_at).toLocaleString('pt-BR')])
  if (inspection.score_percentage !== null) {
    metaItems.push(['Resultado Final', `${inspection.score_percentage}% — ${inspection.passed ? 'APROVADO' : 'REPROVADO'}`])
  }

  if (metaItems.length > 0) {
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(30, 64, 175).setLineWidth(0.5)
    const boxH = metaItems.length * 8 + 6
    doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD')

    doc.setFontSize(10)
    metaItems.forEach((item, idx) => {
      const ly = y + 8 + idx * 8
      doc.setFont('helvetica', 'bold').setTextColor(60)
      doc.text(item[0] + ':', margin + 4, ly)
      doc.setFont('helvetica', 'normal').setTextColor(20)
      const valLines = doc.splitTextToSize(item[1], contentWidth - 70)
      doc.text(valLines, margin + 65, ly)
    })
    y += boxH + 8
  }

  drawFooter()

  // ============ ONE PAGE PER QUESTION ============
  for (const section of sections) {
    for (const field of section.fields) {
      const val = responses[field.id]
      const formatted = formatValue(field, val)
      const note = notes[field.id]
      const fieldPhotos = photos.filter(p => p.field_id === field.id)
      const photosOnly = fieldPhotos.filter(p => !p.mime_type?.startsWith('video/'))
      const videos = fieldPhotos.filter(p => p.mime_type?.startsWith('video/'))

      // Use pre-loaded images from parallel cache
      const photoBlocks = photosOnly.map(p => photoUrlMap.get(p.id) ?? null)

      // Render this question across one or more pages (6 photos per page)
      const photosPerPage = 6
      const totalPhotoPages = Math.max(1, Math.ceil(photoBlocks.length / photosPerPage))

      for (let pageIdx = 0; pageIdx < totalPhotoPages; pageIdx++) {
        doc.addPage()
        const isContinuation = pageIdx > 0
        let py = drawHeader(isContinuation ? `${inspection.title} — continuação` : inspection.title)

        // ===== Section header (gray box) =====
        const sectionDescLines = section.description
          ? doc.splitTextToSize(section.description, contentWidth - 6)
          : []
        const sectionH = 8 + sectionDescLines.length * 3.5 + 3

        doc.setFillColor(229, 231, 235) // gray-200
        doc.setDrawColor(150)
        doc.rect(margin, py, contentWidth, sectionH, 'FD')

        doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(20)
        doc.text(section.title, margin + 3, py + 5.5)

        if (sectionDescLines.length > 0) {
          doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(60)
          doc.text(sectionDescLines, margin + 3, py + 9.5)
        }
        py += sectionH

        if (isContinuation) {
          doc.setFontSize(8).setFont('helvetica', 'italic').setTextColor(120)
          doc.text('(continuação da pergunta anterior)', margin, py + 3)
          py += 5
        }

        // ===== Question / Test Description (justified) =====
        doc.setDrawColor(150)
        doc.setFillColor(255, 255, 255)
        doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(20)
        const qLabelLines = doc.splitTextToSize(field.label, contentWidth - 6)
        doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80)
        const descCfgLines = field.description ? doc.splitTextToSize(`Critério de aceitação: ${field.description}`, contentWidth - 6) : []
        const qHeight = 4 + qLabelLines.length * 4.5 + (descCfgLines.length > 0 ? descCfgLines.length * 4 + 3 : 0) + 3

        doc.rect(margin, py, contentWidth, qHeight, 'D')

        doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(20)
        // Justified text using jsPDF align option
        doc.text(qLabelLines, margin + 3, py + 6, { align: 'justify', maxWidth: contentWidth - 6 })

        if (descCfgLines.length > 0) {
          doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80)
          doc.text(descCfgLines, margin + 3, py + 6 + qLabelLines.length * 4.5 + 3, { align: 'justify', maxWidth: contentWidth - 6 })
        }
        py += qHeight

        // ===== Result =====
        const resultColor: [number, number, number] = (() => {
          if (field.field_type === 'yes_no_na') {
            if (val === 'yes') return [22, 163, 74]
            if (val === 'no') return [220, 38, 38]
          }
          return [20, 20, 20]
        })()
        const resultBgColor: [number, number, number] = (() => {
          if (field.field_type === 'yes_no_na') {
            if (val === 'yes') return [240, 253, 244]
            if (val === 'no') return [254, 242, 242]
          }
          return [255, 255, 255]
        })()

        const valLines = doc.splitTextToSize(formatted, contentWidth - 25)
        const rH = 6 + valLines.length * 4 + 3

        doc.setFillColor(...resultBgColor)
        doc.setDrawColor(150)
        doc.rect(margin, py, contentWidth, rH, 'FD')

        doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(20)
        doc.text('Resultado:', margin + 3, py + 5)
        doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(...resultColor)
        doc.text(valLines, margin + 23, py + 5)
        py += rH

        // ===== Evidências quadrant =====
        const remaining = pageHeight - margin - 25 - py - 4 // leave room for footer
        const minEvidH = 50
        const evidH = Math.max(minEvidH, remaining)

        doc.setDrawColor(150)
        doc.setFillColor(255, 255, 255)
        doc.rect(margin, py, contentWidth, evidH, 'FD')

        doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(20)
        doc.text('Evidências:', margin + 3, py + 5)
        let evidY = py + 8

        // Notes/observations on top of evidências
        if (note && pageIdx === 0) {
          doc.setFontSize(8).setFont('helvetica', 'italic').setTextColor(217, 119, 6)
          const noteLines = doc.splitTextToSize(`Observação: ${note}`, contentWidth - 6)
          doc.text(noteLines, margin + 3, evidY + 3)
          evidY += noteLines.length * 3.5 + 3
        }

        // Image grid 2 cols x 3 rows (max 6 per page)
        const cols = 2
        const gap = 4
        const cellW = (contentWidth - 6 - gap * (cols - 1)) / cols
        // Reserve space for videos at bottom (~15mm if videos exist on this page)
        const reservedForVideos = (videos.length > 0 && pageIdx === totalPhotoPages - 1) ? Math.min(20, videos.length * 4 + 6) : 0
        const availH = py + evidH - evidY - 4 - reservedForVideos
        const cellH = Math.min((availH - gap * 2) / 3, cellW * 1.0) // square-ish, allow more height for portrait

        const startIdx = pageIdx * photosPerPage
        const endIdx = Math.min(startIdx + photosPerPage, photoBlocks.length)
        const slicePhotos = photoBlocks.slice(startIdx, endIdx)

        if (slicePhotos.length === 0 && pageIdx === 0 && videos.length === 0 && !note) {
          doc.setFontSize(8).setFont('helvetica', 'italic').setTextColor(150)
          doc.text('Nenhuma evidência adicionada.', margin + 3, evidY + 5)
        } else {
          slicePhotos.forEach((photoData, idx) => {
            if (!photoData) return
            const col = idx % cols
            const row = Math.floor(idx / cols)
            const x = margin + 3 + col * (cellW + gap)
            const yPos = evidY + row * (cellH + gap)
            try {
              // Fit image preserving aspect ratio (centered in cell)
              const imgRatio = photoData.w / photoData.h
              const cellRatio = cellW / cellH
              let drawW = cellW, drawH = cellH, offX = 0, offY = 0
              if (imgRatio > cellRatio) {
                // Image is wider: fit by width
                drawH = cellW / imgRatio
                offY = (cellH - drawH) / 2
              } else {
                // Image is taller: fit by height
                drawW = cellH * imgRatio
                offX = (cellW - drawW) / 2
              }
              doc.setFillColor(245, 245, 245)
              doc.rect(x, yPos, cellW, cellH, 'F')
              doc.addImage(photoData.data, photoData.format, x + offX, yPos + offY, drawW, drawH, undefined, 'FAST')
              doc.setDrawColor(180)
              doc.rect(x, yPos, cellW, cellH, 'D')
            } catch (e) { console.warn('[PDF] addImage failed', e) }
          })
        }

        // Videos AFTER images, at bottom of evidências quadrant
        if (videos.length > 0 && pageIdx === totalPhotoPages - 1) {
          const videoY = py + evidH - reservedForVideos + 3
          doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(60)
          doc.text('Vídeos:', margin + 3, videoY)
          let vy = videoY + 4
          videos.forEach((v, vi) => {
            const vUrl = v.storage_path.startsWith('http') ? v.storage_path : `${publicBucketUrl}/${v.storage_path}`
            doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(30, 64, 175)
            const linkText = `Vídeo ${vi + 1}: ${vUrl}`
            const linkLines = doc.splitTextToSize(linkText, contentWidth - 8)
            doc.textWithLink(linkLines[0], margin + 4, vy, { url: vUrl })
            vy += 4
          })
        }

        py += evidH + 2

        drawFooter()
      }
    }
  }

  console.log('[PDF] Generation complete. Pages:', doc.getNumberOfPages())
  return doc.output('blob')
}
