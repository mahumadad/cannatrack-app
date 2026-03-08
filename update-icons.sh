#!/bin/bash

cd ~/develop/dromedapp/camellos-dromedarios/src/components

# ============================================
# JOURNAL.JSX
# ============================================
sed -i '' "s|import styles from './Journal.module.css';|import { House, BookOpen, Notebook, ChartLine, Plus, Trash, ArrowLeft, ArrowRight } from '@phosphor-icons/react';\nimport styles from './Journal.module.css';|" Journal.jsx

sed -i '' 's|<span className={styles.navIcon}>🏠</span>|<House size={24} weight="regular" className={styles.navIcon} />|g' Journal.jsx
sed -i '' 's|<span className={styles.navIcon}>📖</span>|<BookOpen size={24} weight="regular" className={styles.navIcon} />|g' Journal.jsx
sed -i '' 's|<span className={styles.navIcon}>📓</span>|<Notebook size={24} weight="fill" className={styles.navIcon} />|g' Journal.jsx
sed -i '' 's|<span className={styles.navIcon}>📊</span>|<ChartLine size={24} weight="regular" className={styles.navIcon} />|g' Journal.jsx
sed -i '' 's|<span className={styles.emptyIcon}>📓</span>|<Notebook size={48} weight="light" className={styles.emptyIcon} />|g' Journal.jsx
sed -i '' 's|>+</button>|><Plus size={24} weight="bold" /></button>|g' Journal.jsx
sed -i '' 's|🗑️</button>|<Trash size={18} weight="regular" /></button>|g' Journal.jsx
sed -i '' 's|>←</button>|><ArrowLeft size={20} weight="bold" /></button>|g' Journal.jsx
sed -i '' 's|>→</button>|><ArrowRight size={20} weight="bold" /></button>|g' Journal.jsx

# ============================================
# INSIGHTS.JSX
# ============================================
sed -i '' "s|import styles from './Insights.module.css';|import { House, BookOpen, Notebook, ChartLine, ArrowLeft } from '@phosphor-icons/react';\nimport styles from './Insights.module.css';|" Insights.jsx

sed -i '' 's|<span className={styles.navIcon}>🏠</span>|<House size={24} weight="regular" className={styles.navIcon} />|g' Insights.jsx
sed -i '' 's|<span className={styles.navIcon}>📖</span>|<BookOpen size={24} weight="regular" className={styles.navIcon} />|g' Insights.jsx
sed -i '' 's|<span className={styles.navIcon}>📓</span>|<Notebook size={24} weight="regular" className={styles.navIcon} />|g' Insights.jsx
sed -i '' 's|<span className={styles.navIcon}>📊</span>|<ChartLine size={24} weight="fill" className={styles.navIcon} />|g' Insights.jsx
sed -i '' 's|>← Volver</button>|><ArrowLeft size={20} weight="bold" /> Volver</button>|g' Insights.jsx

# ============================================
# SETTINGS.JSX
# ============================================
sed -i '' "s|import styles from './Settings.module.css';|import { ArrowLeft, Clock, Pill, Trash, ClipboardText, Bell, BellRinging, User, SignOut, Warning, CalendarBlank } from '@phosphor-icons/react';\nimport styles from './Settings.module.css';|" Settings.jsx

sed -i '' 's|>←</button>|><ArrowLeft size={20} weight="bold" /></button>|g' Settings.jsx
sed -i '' 's|<div className={styles.menuIcon}>🕐</div>|<Clock size={24} weight="regular" className={styles.menuIcon} />|g' Settings.jsx
sed -i '' 's|<div className={styles.menuIcon}>💊</div>|<Pill size={24} weight="regular" className={styles.menuIcon} />|g' Settings.jsx
sed -i '' 's|<div className={styles.menuIcon}>🗑️</div>|<Trash size={24} weight="regular" className={styles.menuIcon} />|g' Settings.jsx
sed -i '' 's|<div className={styles.menuIcon}>📋</div>|<ClipboardText size={24} weight="regular" className={styles.menuIcon} />|g' Settings.jsx
sed -i '' 's|<div className={styles.menuIcon}>🔔</div>|<Bell size={24} weight="regular" className={styles.menuIcon} />|g' Settings.jsx
sed -i '' 's|<div className={styles.menuIcon}>📝</div>|<BellRinging size={24} weight="regular" className={styles.menuIcon} />|g' Settings.jsx
sed -i '' 's|<div className={styles.menuIcon}>👤</div>|<User size={24} weight="regular" className={styles.menuIcon} />|g' Settings.jsx
sed -i '' 's|<div className={styles.menuIcon}>🚪</div>|<SignOut size={24} weight="regular" className={styles.menuIcon} />|g' Settings.jsx
sed -i '' 's|<div className={styles.modalIcon}>⚠️</div>|<Warning size={48} weight="fill" className={styles.modalIcon} />|g' Settings.jsx

# ============================================
# PROTOCOLCONFIG.JSX
# ============================================
sed -i '' "s|import styles from './ProtocolConfig.module.css';|import { ArrowLeft, CheckCircle } from '@phosphor-icons/react';\nimport styles from './ProtocolConfig.module.css';|" ProtocolConfig.jsx

sed -i '' 's|>← Volver</button>|><ArrowLeft size={20} weight="bold" /> Volver</button>|g' ProtocolConfig.jsx
sed -i '' 's|>✓ Guardar</button>|><CheckCircle size={20} weight="fill" /> Guardar</button>|g' ProtocolConfig.jsx

# ============================================
# FOLLOWUP.JSX
# ============================================
sed -i '' "s|import styles from './FollowUp.module.css';|import { ArrowLeft, CheckCircle, Calendar } from '@phosphor-icons/react';\nimport styles from './FollowUp.module.css';|" FollowUp.jsx

sed -i '' 's|>← Volver</button>|><ArrowLeft size={20} weight="bold" /> Volver</button>|g' FollowUp.jsx
sed -i '' 's|<span className={styles.completedIcon}>✅</span>|<CheckCircle size={48} weight="fill" className={styles.completedIcon} />|g' FollowUp.jsx

# ============================================
# WEEKLYCALENDAR.JSX
# ============================================
sed -i '' "s|import styles from './WeeklyCalendar.module.css';|import { Pill, BookOpen, Calendar, ArrowLeft, ArrowRight } from '@phosphor-icons/react';\nimport styles from './WeeklyCalendar.module.css';|" WeeklyCalendar.jsx

sed -i '' 's|<span className={styles.doseIcon}>💊</span>|<Pill size={14} weight="fill" className={styles.doseIcon} />|g' WeeklyCalendar.jsx
sed -i '' 's|<span className={styles.checkinIcon}>📖</span>|<BookOpen size={14} weight="fill" className={styles.checkinIcon} />|g' WeeklyCalendar.jsx
sed -i '' 's|<span className={styles.followUpIcon}>📅</span>|<Calendar size={14} weight="fill" className={styles.followUpIcon} />|g' WeeklyCalendar.jsx
sed -i '' 's|>←</button>|><ArrowLeft size={18} weight="bold" /></button>|g' WeeklyCalendar.jsx
sed -i '' 's|>→</button>|><ArrowRight size={18} weight="bold" /></button>|g' WeeklyCalendar.jsx

echo "✅ Íconos actualizados en todos los componentes"
