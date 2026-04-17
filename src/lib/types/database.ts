export type UserRole = 'admin' | 'manager' | 'inspector'
export type TemplateStatus = 'draft' | 'published' | 'archived'
export type ScoringMethod = 'none' | 'pass_fail' | 'percentage' | 'numeric_0_10' | 'custom_scale'
export type FieldType = 'text' | 'textarea' | 'yes_no_na' | 'multiple_choice' | 'single_select' | 'number' | 'date' | 'datetime' | 'photo' | 'signature' | 'slider' | 'checkbox_list'
export type InspectionStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'
export type ActionPriority = 'low' | 'medium' | 'high' | 'critical'
export type ActionStatus = 'open' | 'in_progress' | 'completed' | 'overdue'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  organization_id: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface InspectionTemplate {
  id: string
  organization_id: string
  created_by: string
  title: string
  description: string | null
  category: string | null
  status: TemplateStatus
  scoring_method: ScoringMethod
  max_score: number | null
  pass_threshold: number | null
  version: number
  is_current_version: boolean
  parent_template_id: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
  // Relations
  sections?: TemplateSection[]
  creator?: Profile
}

export interface TemplateSection {
  id: string
  template_id: string
  title: string
  description: string | null
  position: number
  is_repeatable: boolean
  min_repeats: number
  max_repeats: number
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
  // Relations
  fields?: TemplateField[]
}

export interface FieldConfig {
  max_length?: number
  placeholder?: string
  labels?: Record<string, string>
  score_map?: Record<string, number | null>
  flag_on?: string[]
  options?: Array<{ value: string; label: string; score?: number }>
  allow_other?: boolean
  min?: number
  max?: number
  step?: number
  unit?: string
  min_photos?: number
  max_photos?: number
  require_annotation?: boolean
}

export interface FieldCondition {
  field_id: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty'
  value: string | number | boolean
}

export type ActionType = 'require_photo' | 'require_video' | 'require_annotation' | 'require_media' | 'show_field' | 'flag' | 'require_note'

export interface FieldAction {
  when: {
    operator: 'equals' | 'not_equals' | 'contains' | 'any'
    value: string | number | boolean | string[]
  }
  then: Array<{
    type: ActionType
    config?: {
      min_media?: number
      field_label?: string
      field_type?: FieldType
      message?: string
    }
  }>
}

export interface TemplateField {
  id: string
  section_id: string
  label: string
  description: string | null
  field_type: FieldType
  is_required: boolean
  position: number
  config: FieldConfig
  weight: number
  conditions: FieldCondition | null
  actions: FieldAction[]
  is_repeatable: boolean
  min_repeats: number
  max_repeats: number
  created_at: string
  updated_at: string
}

export interface Inspection {
  id: string
  organization_id: string
  template_id: string
  template_version: number
  inspector_id: string
  title: string
  location: string | null
  notes: string | null
  status: InspectionStatus
  total_score: number | null
  max_possible_score: number | null
  score_percentage: number | null
  passed: boolean | null
  started_at: string | null
  completed_at: string | null
  latitude: number | null
  longitude: number | null
  device_info: Record<string, unknown> | null
  client_id: string | null
  synced_at: string | null
  created_at: string
  updated_at: string
  // Relations
  template?: InspectionTemplate
  inspector?: Profile
  responses?: InspectionResponse[]
}

export interface InspectionResponse {
  id: string
  inspection_id: string
  field_id: string
  section_id: string
  value: unknown
  score: number | null
  is_flagged: boolean
  flag_notes: string | null
  repeat_index: number
  created_at: string
  updated_at: string
}

export interface InspectionPhoto {
  id: string
  inspection_id: string
  response_id: string | null
  field_id: string | null
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string
  width: number | null
  height: number | null
  thumbnail_path: string | null
  annotations: Record<string, unknown> | null
  latitude: number | null
  longitude: number | null
  taken_at: string | null
  client_id: string | null
  upload_status: string
  created_at: string
}

export interface ActionItem {
  id: string
  organization_id: string
  inspection_id: string
  response_id: string | null
  title: string
  description: string | null
  priority: ActionPriority
  status: ActionStatus
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total_inspections: number
  completed: number
  drafts: number
  pass_rate: number
  avg_score: number
  open_actions: number
  templates_count: number
}
