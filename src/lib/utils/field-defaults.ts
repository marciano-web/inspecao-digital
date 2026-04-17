import type { FieldType, FieldConfig } from '@/lib/types/database'

export const fieldTypeLabels: Record<FieldType, string> = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  yes_no_na: 'Sim / Não / N/A',
  multiple_choice: 'Múltipla escolha',
  single_select: 'Seleção única',
  number: 'Número',
  date: 'Data',
  datetime: 'Data e hora',
  photo: 'Foto / Evidência',
  signature: 'Assinatura',
  slider: 'Escala (slider)',
  checkbox_list: 'Lista de verificação',
}

export function getDefaultConfig(fieldType: FieldType): FieldConfig {
  switch (fieldType) {
    case 'text':
      return { max_length: 200, placeholder: '' }
    case 'textarea':
      return { max_length: 2000, placeholder: '' }
    case 'yes_no_na':
      return {
        labels: { yes: 'Conforme', no: 'Não Conforme', na: 'N/A' },
        score_map: { yes: 1, no: 0, na: null },
        flag_on: ['no'],
      }
    case 'multiple_choice':
    case 'single_select':
      return {
        options: [
          { value: 'opt1', label: 'Opção 1' },
          { value: 'opt2', label: 'Opção 2' },
        ],
        allow_other: false,
      }
    case 'number':
      return { min: 0, max: 100, step: 1, unit: '' }
    case 'date':
    case 'datetime':
      return {}
    case 'photo':
      return { min_photos: 0, max_photos: 5, require_annotation: false }
    case 'slider':
      return { min: 0, max: 10, step: 1, labels: { '0': 'Mínimo', '10': 'Máximo' } }
    case 'checkbox_list':
      return {
        options: [
          { value: 'item1', label: 'Item 1' },
          { value: 'item2', label: 'Item 2' },
        ],
      }
    case 'signature':
      return {}
    default:
      return {}
  }
}
