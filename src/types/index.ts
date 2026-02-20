// ===== User & Auth =====
export interface User {
  id: string;
  email: string;
  name?: string;
  onboarding_completed?: boolean;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  session?: Session;
}

// ===== Shopify Customer Data =====
export interface ShopifyAddress {
  id: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  zip: string | null;
  formatted: string[];
}

export interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

export interface ShopifyLineItem {
  name: string;
  quantity: number;
  sku: string | null;
  image: { url: string; altText: string | null } | null;
  currentTotalPrice: ShopifyMoney;
  variantTitle: string | null;
}

export interface ShopifyFulfillment {
  status: string;
  latestShipmentStatus: string | null;
  estimatedDeliveryAt: string | null;
  trackingInformation: { number: string; url: string }[];
}

export interface ShopifyShippingAddress {
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  zip: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  number: number;
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPrice: ShopifyMoney;
  subtotal?: ShopifyMoney;
  totalShipping?: ShopifyMoney;
  totalTax?: ShopifyMoney;
  shippingAddress?: ShopifyShippingAddress | null;
  lineItems: { nodes: ShopifyLineItem[] };
  fulfillments: { nodes: ShopifyFulfillment[] };
}

export interface ShopifySubscriptionLine {
  name: string;
  quantity: number;
  currentPrice: ShopifyMoney;
  variantImage: { url: string; altText: string | null } | null;
}

export interface ShopifySubscription {
  id: string;
  status: string;
  nextBillingDate: string | null;
  deliveryPrice: ShopifyMoney;
  lines: { nodes: ShopifySubscriptionLine[] };
}

export interface ShopifyCustomerProfile {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  emailAddress: { emailAddress: string } | null;
  phoneNumber: { phoneNumber: string } | null;
  imageUrl: string | null;
  creationDate: string | null;
  tags: string[];
  defaultAddress: ShopifyAddress | null;
  addresses: { nodes: ShopifyAddress[] };
}

export interface ShopifyStoreData {
  orders: ShopifyOrder[];
  subscriptions: ShopifySubscription[];
}

// ===== Protocol =====
export type ProtocolFrequency =
  | 'fadiman'
  | 'stamets'
  | 'custom'
  | 'specific_days'
  | 'every_x_days'
  | 'intuitive';

export interface CustomDays {
  lunes: boolean;
  martes: boolean;
  miercoles: boolean;
  jueves: boolean;
  viernes: boolean;
  sabado: boolean;
  domingo: boolean;
}

export interface CustomPattern {
  on: number;
  off: number;
}

export type FrequencyValue = CustomDays | CustomPattern | { days: number } | null;

export interface Protocol {
  id?: string;
  user_id?: string;
  frequency: ProtocolFrequency;
  frequency_value: FrequencyValue;
  dose_time: string | null;
  substance?: string | null;
  dose: number;
  unit: string;
  duration: number | string | null;
  start_date: string | null;
  startDate?: string;
  doseTime?: string;
  updated_at?: string;
}

// ===== Checkin =====
export interface CheckinFields {
  mood: number;
  anxiety: number;
  energy: number;
  sleep: number;
  focus: number;
  sociability: number;
  rumination: number;
  functionality: number;
  productivity: number;
  connection: number;
}

export interface Checkin extends Partial<CheckinFields> {
  id: string;
  user_id: string;
  date: string;
  change_perceived?: string;
  change_attribution?: string;
  adverse_event?: string;
  adverse_type?: string;
  adverse_intensity?: string;
  adverse_duration?: string;
  adverse_interference?: string;
  adverse_help?: string;
  created_at?: string;
  [key: string]: unknown;
}

// ===== Dose =====
export interface DoseLog {
  id: string;
  user_id: string;
  date: string;
  substance?: string | null;
  dose: number;
  unit: string;
  notes?: string | null;
  created_at?: string;
}

// ===== Baseline =====
export interface Baseline {
  id?: string;
  user_id?: string;
  is_locked?: boolean;
  locked_at?: string;
  [key: string]: unknown;
}

// ===== FollowUp =====
export interface FollowUp {
  id?: string;
  user_id?: string;
  month_year: string;
  due_date?: string;
  is_completed: boolean;
  completed_at?: string | null;
  // DASS-21
  dass_1?: number | null; dass_2?: number | null; dass_3?: number | null;
  dass_4?: number | null; dass_5?: number | null; dass_6?: number | null;
  dass_7?: number | null; dass_8?: number | null; dass_9?: number | null;
  dass_10?: number | null; dass_11?: number | null; dass_12?: number | null;
  dass_13?: number | null; dass_14?: number | null; dass_15?: number | null;
  dass_16?: number | null; dass_17?: number | null; dass_18?: number | null;
  dass_19?: number | null; dass_20?: number | null; dass_21?: number | null;
  // PANAS
  panas_1?: number | null; panas_2?: number | null; panas_3?: number | null;
  panas_4?: number | null; panas_5?: number | null; panas_6?: number | null;
  panas_7?: number | null; panas_8?: number | null; panas_9?: number | null;
  panas_10?: number | null; panas_11?: number | null; panas_12?: number | null;
  panas_13?: number | null; panas_14?: number | null; panas_15?: number | null;
  panas_16?: number | null; panas_17?: number | null; panas_18?: number | null;
  panas_19?: number | null; panas_20?: number | null;
  // PSS-10
  pss_1?: number | null; pss_2?: number | null; pss_3?: number | null;
  pss_4?: number | null; pss_5?: number | null; pss_6?: number | null;
  pss_7?: number | null; pss_8?: number | null; pss_9?: number | null;
  pss_10?: number | null;
  // Satisfaccion vital
  life_satisfaction?: number | null;
  // Evaluacion global
  overall_change?: string;
  change_areas?: string[];
  cambios_importantes?: string;
  // Atribucion
  attribution_factors?: string[];
  without_microdose?: string;
  // Eventos adversos
  side_effects?: string;
  side_effects_details?: string;
  // Continuidad
  continue_protocol?: string;
  protocol_changes?: string;
  continue_reason?: string;
  general_notes?: string;
  [key: string]: unknown;
}

export interface FollowUpMonthSummary {
  monthYear: string;
  monthName: string;
  dueDate?: string;
  isCompleted: boolean;
  canComplete: boolean;
}

export interface FollowUpInfo {
  hasDoses: boolean;
  message?: string;
  monthYear?: string;
  monthName?: string;
  dueDate?: string;
  dueDateFormatted?: string;
  existing?: FollowUp | null;
  isCompleted?: boolean;
  canComplete?: boolean;
  allMonths?: FollowUpMonthSummary[];
}

// ===== Insights =====
export interface EmotionalDataPoint {
  day: string;
  date?: string;
  [field: string]: string | number | undefined;
}

export interface InsightsData {
  emotional: EmotionalDataPoint[];
  avgMood: string;
  avgEnergy: string;
  avgAnxiety: string;
  avgFocus: string;
  avgSleep: string;
  avgSociability: string;
  avgRumination: string;
  avgFunctionality: string;
  avgProductivity: string;
  avgConnection: string;
  totalDoses: number;
  totalCheckins: number;
  checkins: Checkin[];
  doses: DoseLog[];
}

export interface ComparisonAverages {
  count: number;
  wellbeing: string;
  [key: string]: string | number | undefined;
}

export interface ComparisonData {
  withDose: ComparisonAverages;
  withoutDose: ComparisonAverages;
}

// ===== UI Types =====
export interface FieldLabel {
  label: string;
  emoji: string;
  color?: string;
  low?: string;
  high?: string;
}

export interface FieldLabelsMap {
  [key: string]: FieldLabel;
}

export interface DoseOption {
  value: number;
  label: string;
  sublabel: string;
}

export interface Quote {
  id?: string;
  text: string;
  emoji: string;
}

export interface CustomDoseState {
  amount: number;
  unit: string;
}

// ===== Calendar =====
export interface CalendarDay {
  date: Date;
  dateString: string;
  day: number;
  weekday: string;
  isToday: boolean;
  isFuture: boolean;
  isClickable: boolean;
  isFollowUpDay: boolean;
  isFollowUpCompleted: boolean;
  isOtherMonth: boolean;
  doses?: DoseLog[];
  checkin?: Checkin | null;
}

export interface CountdownState {
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  isToday: boolean;
}

// ===== Toast =====
export interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// ===== Solicitudes & Recetas =====
export type SolicitudEstado = 'pendiente' | 'pre_aprobado' | 'aprobado' | 'rechazado' | 'cancelado' | 'pagado' | 'despachado' | 'entregado';

export interface CartItem {
  id: string;
  category: 'Microdosis' | 'Macrodosis';
  gramaje?: string;
  capsulas?: string;
  producto?: string;
  displayLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Solicitud {
  id: string;
  submission_id: string;
  user_id: string;
  receta_id: string | null;
  estado: SolicitudEstado;
  tipo?: 'dispensacion' | 'receta';
  email: string;
  telefono?: string;
  notas_cliente?: string;
  cart_json: CartItem[];
  cantidad_micro: number;
  cantidad_macro: number;
  total_estimado: number;
  draft_order_url?: string;
  observaciones?: string;
  cancelado_por?: string;
  cancelado_razon?: string;
  aprobado_at?: string;
  // AI-extracted fields (receta solicitudes)
  ai_confianza?: string;
  ai_paciente_nombre?: string;
  ai_medico_nombre?: string;
  ai_fecha_emision?: string;
  ai_total_micro?: number;
  ai_total_macro?: number;
  ai_gramaje_micro?: string;
  ai_gramaje_macro?: string;
  ai_protocolo?: string;
  ai_duracion?: string;
  created_at: string;
  updated_at: string;
}

export interface Receta {
  id: string;
  user_id: string;
  estado: string;
  paciente_nombre: string | null;
  paciente_rut: string | null;
  medico_nombre: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  total_micro_autorizado: number;
  total_macro_autorizado: number;
  gramaje_micro: string | null;
  gramaje_macro: string | null;
  saldo_micro: number;
  saldo_macro: number;
  protocolo: string | null;
  duracion: string | null;
  notas: string | null;
  ai_confianza: string | null;
  archivo_micro_path: string | null;
  archivo_macro_path: string | null;
  archivo_micro_url?: string | null;
  archivo_macro_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MicrodosisOption {
  gramaje: string;
  label: string;
  options: { capsulas: string; price: number }[];
}

export interface MacrodosisOption {
  key: string;
  label: string;
  price: number;
  grams?: number;
}

export interface ProductCatalog {
  microdosis: MicrodosisOption[];
  macrodosis: MacrodosisOption[];
}

// ===== Window augmentation for notifications =====
declare global {
  interface Window {
    __notificationIntervalId?: ReturnType<typeof setInterval> | null;
  }
}
