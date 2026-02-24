import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../utils/analytics';
import { useToast } from './Toast';
import { useUser } from '../hooks/useUser';
import { useRecetasQuery, useCatalog, useCreateSolicitud } from '../hooks/queries';
import useSwipeBack from '../hooks/useSwipeBack';
import { ArrowLeft, ArrowRight, Check, UploadSimple, ShoppingCart, Trash, CheckCircle, Pill, Warning, CalendarBlank, User, Star, Camera, PaperPlaneTilt, Plant, Leaf } from '@phosphor-icons/react';
import styles from './SolicitudForm.module.css';
import { formatCLP } from '../utils/formatters';
import type { ProductCatalog, MicrodosisOption, MacrodosisOption, CartItem, Receta } from '../types';

type Step = 'micro' | 'macro' | 'recetas' | 'resumen';
const STEPS: Step[] = ['micro', 'macro', 'recetas', 'resumen'];

// Per-step theme colors
const STEP_COLORS: Record<Step, { color: string; light: string; label: string; progress: string }> = {
  micro:   { color: '#14b858', light: '#f0fdf4', label: 'Selección Microdosis', progress: '25%' },
  macro:   { color: '#5048e5', light: '#f0efff', label: 'Selección Macrodosis', progress: '50%' },
  recetas: { color: '#5048e5', light: '#f0efff', label: 'Adjuntar Receta', progress: '75%' },
  resumen: { color: '#a57f50', light: '#fbfaf9', label: 'Finalizar', progress: '100%' },
};

// Micro pauta labels by index
const MICRO_PAUTAS = [
  { label: 'PAUTA INICIAL', style: 'badgePautaGreen' as const },
  { label: 'REQUIERE ACTUALIZACIÓN', style: 'badgePautaGray' as const },
  { label: 'PAUTA AVANZADA', style: 'badgePautaGray' as const },
];

const SolicitudForm: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast()!;
  const { user } = useUser();
  const { data: allRecetas = [], isLoading: loadingRecetas } = useRecetasQuery(user?.id);
  useSwipeBack();
  const recetasActivas = allRecetas.filter((r: Receta) => r.estado === 'activa');

  const { data: catalog } = useCatalog();
  const createSolicitud = useCreateSolicitud();
  const [step, setStep] = useState<Step>('micro');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [preselected, setPreselected] = useState(false);

  // Micro selection state
  const [selectedGramaje, setSelectedGramaje] = useState<string | null>(null);
  const [selectedCapsulas, setSelectedCapsulas] = useState<string | null>(null);
  const [microQty, setMicroQty] = useState(1);

  // Macro selection state
  const [selectedMacro, setSelectedMacro] = useState<string | null>(null);
  const [macroCategory, setMacroCategory] = useState('');

  // Receta & notas
  const [recipeFile, setRecipeFile] = useState<string | null>(null);
  const [recipeFileName, setRecipeFileName] = useState('');
  const [notas, setNotas] = useState('');
  const [selectedRecetaId, setSelectedRecetaId] = useState<string | null>(null);

  const recipeFileRef = useRef<HTMLInputElement>(null);

  // Derived: find receta for micro and macro from all active recetas
  const recetaMicroConSaldo = recetasActivas.find(r => r.total_micro_autorizado > 0 && r.saldo_micro > 0) || null;
  const recetaMacroConSaldo = recetasActivas.find(r => r.total_macro_autorizado > 0 && r.saldo_macro > 0) || null;
  const hasAnyReceta = recetasActivas.length > 0;
  const recetaMicro = hasAnyReceta ? recetasActivas[0] : null;
  const recetaMacro = hasAnyReceta ? recetasActivas[0] : null;

  // Auto-select gramaje and max capsulas from active micro receta once catalog loads
  useEffect(() => {
    if (!catalog || preselected) return;

    if (recetaMicroConSaldo?.gramaje_micro && recetaMicroConSaldo.saldo_micro > 0) {
      const matchingGramaje = catalog.microdosis.find(m =>
        m.gramaje.replace(/\s/g, '').toLowerCase() === recetaMicroConSaldo.gramaje_micro!.replace(/\s/g, '').toLowerCase()
      );
      if (matchingGramaje) {
        setSelectedGramaje(matchingGramaje.gramaje);
        const sortedOptions = [...matchingGramaje.options].sort(
          (a, b) => parseInt(b.capsulas) - parseInt(a.capsulas)
        );
        const bestFit = sortedOptions.find(o => parseInt(o.capsulas) <= recetaMicroConSaldo.saldo_micro);
        if (bestFit) {
          setSelectedCapsulas(bestFit.capsulas);
        } else {
          const smallest = sortedOptions[sortedOptions.length - 1];
          if (smallest) setSelectedCapsulas(smallest.capsulas);
        }
      }
    }

    if (recetaMacroConSaldo?.gramaje_macro && recetaMacroConSaldo.saldo_macro > 0) {
      const maxGrams = parseFloat(recetaMacroConSaldo.gramaje_macro.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
      if (maxGrams > 0) {
        const sorted = [...catalog.macrodosis].sort((a, b) => (b.grams || 0) - (a.grams || 0));
        const bestFit = sorted.find(m => (m.grams || 0) <= maxGrams);
        if (bestFit) setSelectedMacro(bestFit.key);
      }
    }

    setPreselected(true);
  }, [catalog, recetaMicroConSaldo, recetaMacroConSaldo, preselected]);

  const hasMicro = cart.some(i => i.category === 'Microdosis');
  const hasMacro = cart.some(i => i.category === 'Macrodosis');
  const cartTotal = cart.reduce((sum, i) => sum + i.lineTotal, 0);

  // Cart quantities for saldo warnings
  const cartMicroCaps = cart.filter(i => i.category === 'Microdosis').reduce((sum, i) => sum + parseInt(i.capsulas || '0') * (i.quantity || 1), 0);
  const cartMacroGrams = cart.filter(i => i.category === 'Macrodosis').reduce((sum, i) => {
    const producto = catalog?.macrodosis.find(m => m.key === i.producto);
    return sum + (producto?.grams || 0) * (i.quantity || 1);
  }, 0);
  const recetaMacroGramsMax = recetaMacroConSaldo?.gramaje_macro
    ? parseFloat(recetaMacroConSaldo.gramaje_macro.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0
    : 0;
  const cartMicroGramajes = [...new Set(cart.filter(i => i.category === 'Microdosis').map(i => i.gramaje))];

  // ─── Add to cart ───────────────────────
  const addMicroToCart = () => {
    if (!selectedGramaje || !selectedCapsulas || !catalog) return;
    const gramaje = catalog.microdosis.find(m => m.gramaje === selectedGramaje);
    const option = gramaje?.options.find(o => o.capsulas === selectedCapsulas);
    if (!gramaje || !option) return;

    const item: CartItem = {
      id: `micro-${selectedGramaje}-${selectedCapsulas}-${Date.now()}`,
      category: 'Microdosis',
      gramaje: selectedGramaje,
      capsulas: selectedCapsulas,
      displayLabel: `${gramaje.label} x ${selectedCapsulas} caps`,
      unitPrice: option.price,
      quantity: microQty,
      lineTotal: option.price * microQty
    };

    setCart(prev => [...prev, item]);
    setSelectedGramaje(null);
    setSelectedCapsulas(null);
    setMicroQty(1);
    toast.success('Agregado al carrito');
  };

  const addMacroToCart = (macroKey?: string) => {
    const key = macroKey || selectedMacro;
    if (!key || !catalog) return;
    const producto = catalog.macrodosis.find(m => m.key === key);
    if (!producto) return;

    const item: CartItem = {
      id: `macro-${key}-${Date.now()}`,
      category: 'Macrodosis',
      producto: key,
      displayLabel: producto.label,
      unitPrice: producto.price,
      quantity: 1,
      lineTotal: producto.price
    };

    setCart(prev => [...prev, item]);
    setSelectedMacro(null);
    toast.success('Agregado al carrito');
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  // ─── File upload ───────────────────────
  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string | null) => void,
    nameSetter: (v: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Solo se aceptan JPG, PNG, WebP o PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar 10 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
      nameSetter(file.name);
    };
    reader.readAsDataURL(file);
  };

  // ─── Submit ────────────────────────────
  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    const needsReceta = (hasMicro && !recetaMicro) || (hasMacro && !recetaMacro);
    if (needsReceta && !recipeFile) {
      toast.error('Sube tu receta médica');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createSolicitud.mutateAsync({
        cart,
        notas: notas || null,
        recipeMicro: recipeFile,
        recipeMacro: null
      });
      trackEvent('solicitud_created', { items: cart.length });
      setSuccess(result.submission_id);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al enviar solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Navigation ────────────────────────
  const stepIndex = STEPS.indexOf(step);
  const canGoNext = () => {
    if (step === 'recetas') {
      if (loadingRecetas) return false;
      const needsReceta = (hasMicro && !recetaMicro) || (hasMacro && !recetaMacro);
      if (needsReceta && !recipeFile) return false;
      return true;
    }
    return true;
  };

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
    else navigate('/store');
  };

  const stepTheme = STEP_COLORS[step];

  // ─── Helpers ───────────────────────────
  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  // Macro: unique categories
  const macroCategories = catalog
    ? ['', ...Array.from(new Set(catalog.macrodosis.map(m => m.category || '').filter(Boolean)))]
    : [''];
  const filteredMacro = catalog
    ? catalog.macrodosis.filter(m => !macroCategory || m.category === macroCategory)
    : [];

  // Micro: check if gramaje is authorized by receta
  const isGramajeAuthorized = (gramaje: string) => {
    if (!recetaMicroConSaldo?.gramaje_micro) return true; // no receta = all open
    return gramaje.replace(/\s/g, '').toLowerCase() === recetaMicroConSaldo.gramaje_micro.replace(/\s/g, '').toLowerCase();
  };

  // Macro: check if product exceeds receta limit
  const macroExceedsLimit = (m: MacrodosisOption) => {
    if (!recetaMacroConSaldo?.gramaje_macro) return false;
    return (m.grams || 0) > recetaMacroGramsMax;
  };

  // ─── Renders ───────────────────────────

  if (!catalog) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 className={styles.title}>Nueva Solicitud</h1>
          <div style={{ width: 36 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
          <div className={styles.loadingSpinner} />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.successScreen}>
          <div className={styles.successIcon}>
            <CheckCircle size={40} weight="bold" />
          </div>
          <h2 className={styles.successTitle}>Solicitud enviada</h2>
          <p className={styles.successSubtitle}>Tu solicitud ha sido recibida y está en revisión</p>
          <div className={styles.successId}>{success}</div>
          <button className={styles.btnPrimary} style={{ width: 'auto', padding: '12px 32px', background: 'var(--gradient-primary)' }} onClick={() => navigate('/store/solicitudes')}>
            Ver mis solicitudes
          </button>
          <button className={styles.btnSecondary} style={{ width: 'auto', padding: '10px 24px', marginTop: 8 }} onClick={() => navigate('/store')}>
            Volver al store
          </button>
        </div>
      </div>
    );
  }

  const selectedGramajeData = catalog.microdosis.find(m => m.gramaje === selectedGramaje);

  return (
    <div className={styles.page} style={{ '--step-color': stepTheme.color, '--step-color-light': stepTheme.light } as React.CSSProperties}>
      {submitting && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Enviando solicitud...</p>
        </div>
      )}

      <div className={styles.header}>
        <button className={styles.backButton} onClick={goBack}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 className={styles.title}>Nueva Solicitud</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Progress stepper */}
      <div className={styles.stepperSection}>
        <div className={styles.stepCounter}>
          <span className={styles.stepCounterText}>PASO {stepIndex + 1} de {STEPS.length}</span>
          <span className={styles.stepCounterRight}>{stepTheme.label}</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: stepTheme.progress }} />
        </div>
      </div>

      <div className={styles.content}>
        {/* ─── Step: Micro ─── */}
        {step === 'micro' && (
          <>
            <h2 className={styles.sectionTitle}>Elige tu microdosis</h2>
            <p className={styles.sectionSubtitle}>Selecciona el gramaje según tu pauta médica actual.</p>

            {recetaMicroConSaldo && (
              <div className={styles.infoBanner}>
                <div className={styles.infoBannerIcon}>
                  <Star size={18} weight="fill" />
                </div>
                <div className={styles.infoBannerText}>
                  <div className={styles.infoBannerLabel}>Receta activa</div>
                  Hemos preseleccionado tu dosis recomendada. Saldo: <strong>{recetaMicroConSaldo.saldo_micro} caps</strong>
                  {recetaMicroConSaldo.gramaje_micro && <> · <strong>{recetaMicroConSaldo.gramaje_micro}</strong></>}
                </div>
              </div>
            )}

            {catalog.microdosis.map((m: MicrodosisOption, idx: number) => {
              const isAuthorized = isGramajeAuthorized(m.gramaje);
              const isRecetaMatch = recetaMicroConSaldo?.gramaje_micro
                && m.gramaje.replace(/\s/g, '').toLowerCase() === recetaMicroConSaldo.gramaje_micro.replace(/\s/g, '').toLowerCase();
              const isSelected = selectedGramaje === m.gramaje;
              const pauta = MICRO_PAUTAS[idx] || MICRO_PAUTAS[MICRO_PAUTAS.length - 1];

              return (
                <div
                  key={m.gramaje}
                  className={`${styles.microCard} ${isSelected ? styles.microCardActive : ''} ${!isAuthorized && !isSelected ? styles.microCardDisabled : ''}`}
                  onClick={() => {
                    if (!isAuthorized && !isSelected) return;
                    setSelectedGramaje(isSelected ? null : m.gramaje);
                    setSelectedCapsulas(null);
                    setMicroQty(1);
                  }}
                >
                  <div className={styles.microCardHeader}>
                    <div>
                      {isRecetaMatch && (
                        <span className={styles.badgeReceta}>
                          <Star size={10} weight="fill" /> Receta Activa
                        </span>
                      )}
                    </div>
                    <span className={styles[pauta.style]}>{pauta.label}</span>
                  </div>

                  <div className={styles.microCardDose}>{m.gramaje} / cápsula</div>
                  <div className={styles.microCardSpecies}>{m.description || 'Psilocybe Cubensis'}</div>

                  {!isAuthorized && !isSelected && (
                    <button className={styles.linkDetails} onClick={e => e.stopPropagation()}>
                      Ver detalles <ArrowRight size={12} />
                    </button>
                  )}

                  {/* Capsulas selector when selected */}
                  {isSelected && selectedGramajeData && (
                    <div style={{ marginTop: 10 }}>
                      <p className={styles.sectionSubtitle} style={{ margin: '0 0 8px' }}>Cantidad de cápsulas</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selectedGramajeData.options.map(opt => (
                          <button
                            key={opt.capsulas}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: selectedCapsulas === opt.capsulas ? '2px solid var(--step-color)' : '1.5px solid var(--color-border-light)',
                              background: selectedCapsulas === opt.capsulas ? 'var(--step-color-light)' : 'white',
                              color: selectedCapsulas === opt.capsulas ? 'var(--step-color)' : 'var(--color-text-secondary)',
                              fontSize: 'var(--text-sm)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                            onClick={(e) => { e.stopPropagation(); setSelectedCapsulas(opt.capsulas); }}
                          >
                            {opt.capsulas} caps · {formatCLP(opt.price)}
                          </button>
                        ))}
                      </div>

                      {selectedCapsulas && (
                        <>
                          {/* Quantity stepper */}
                          <div className={styles.qtyStepper}>
                            <button className={`${styles.qtyBtn} ${microQty <= 1 ? styles.qtyBtnDisabled : ''}`} onClick={e => { e.stopPropagation(); setMicroQty(q => Math.max(1, q - 1)); }}>−</button>
                            <span className={styles.qtyValue}>{microQty}</span>
                            <button className={styles.qtyBtn} onClick={e => { e.stopPropagation(); setMicroQty(q => q + 1); }}>+</button>
                          </div>

                          {recetaMicroConSaldo && microQty > 1 && (
                            <div className={styles.qtyError}>
                              Máximo 1 unidad por pedido según receta.
                            </div>
                          )}

                          <button className={styles.addToCartBtn} onClick={e => { e.stopPropagation(); addMicroToCart(); }}>
                            <ShoppingCart size={16} weight="bold" /> Agregar al carrito
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ─── Step: Macro ─── */}
        {step === 'macro' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
              <h2 className={styles.sectionTitle}>Selección Macrodosis</h2>
              {recetaMacroConSaldo && (
                <span className={styles.saldoBadge}>
                  Disponible: {recetaMacroConSaldo.gramaje_macro || `${recetaMacroConSaldo.saldo_macro} disp.`}
                </span>
              )}
            </div>
            <p className={styles.sectionSubtitle}>Elige tus productos de macrodosis según tu receta médica.</p>

            {/* Category filter tabs */}
            {macroCategories.length > 2 && (
              <div className={styles.categoryTabs}>
                {macroCategories.map(cat => (
                  <button
                    key={cat || '__all'}
                    className={macroCategory === cat ? styles.categoryTabActive : styles.categoryTab}
                    onClick={() => setMacroCategory(cat)}
                  >
                    {cat || 'Todos'}
                  </button>
                ))}
              </div>
            )}

            {filteredMacro.map((m: MacrodosisOption, idx: number) => {
              const exceeds = macroExceedsLimit(m);
              const inCart = cart.some(c => c.producto === m.key);

              return (
                <div key={m.key} className={exceeds ? styles.macroCardDisabled : styles.macroCard}>
                  {idx === 0 && !exceeds && <span className={styles.badgePopular}>Popular</span>}
                  {exceeds && <span className={styles.badgeExcede}>EXCEDE LÍMITE</span>}

                  <div className={styles.macroCardBody}>
                    <div className={styles.macroCardImage}>
                      {m.imageUrl ? (
                        <img src={m.imageUrl} alt={m.label} />
                      ) : (
                        <Plant size={28} weight="duotone" />
                      )}
                    </div>
                    <div className={styles.macroCardInfo}>
                      <p className={styles.macroCardTitle}>{m.label}</p>
                      {m.description && <p className={styles.macroCardDesc}>{m.description}</p>}
                      <span className={styles.macroCardWeight}>{m.grams ? `${m.grams}g netos` : ''}</span>
                    </div>
                  </div>

                  <div className={styles.macroCardFooter}>
                    <div className={styles.macroCardPriceWrap}>
                      <span className={styles.macroCardPrice}>{formatCLP(m.price)}</span>
                    </div>
                    {exceeds ? (
                      <button className={styles.macroCardBtnDisabled} disabled>No disponible</button>
                    ) : inCart ? (
                      <button className={styles.macroCardBtn} style={{ background: 'var(--color-success)' }} disabled>
                        <Check size={14} weight="bold" /> Agregado
                      </button>
                    ) : (
                      <button className={styles.macroCardBtn} onClick={() => addMacroToCart(m.key)}>
                        + Agregar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ─── Step: Recetas ─── */}
        {step === 'recetas' && (
          <>
            <h2 className={styles.sectionTitle}>Adjuntar Receta Médica</h2>
            <p className={styles.sectionSubtitle}>
              {hasAnyReceta
                ? 'Puedes usar una receta existente o subir una nueva.'
                : 'Sube una foto clara de tu receta médica vigente para continuar.'}
            </p>

            {/* Upload zone */}
            <input ref={recipeFileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => handleFileSelect(e, setRecipeFile, setRecipeFileName)} />
            <div
              className={`${styles.uploadZone} ${recipeFile ? styles.uploadZoneFilled : ''}`}
              onClick={() => recipeFileRef.current?.click()}
            >
              <div className={styles.uploadZoneIcon}>
                <Camera size={24} weight="duotone" />
              </div>
              <p className={styles.uploadZoneTitle}>{recipeFile ? 'Archivo seleccionado' : 'Sube tu receta'}</p>
              <p className={styles.uploadZoneFormats}>Formatos aceptados: JPG, PNG o PDF. Máximo 10MB.</p>
              {recipeFileName && <p className={styles.uploadFileName}>{recipeFileName}</p>}
              {!recipeFile && (
                <button className={styles.uploadZoneBtn} onClick={e => { e.stopPropagation(); recipeFileRef.current?.click(); }}>
                  <UploadSimple size={14} weight="bold" /> Seleccionar Archivo
                </button>
              )}
            </div>

            {/* Recent prescriptions */}
            {recetasActivas.length > 0 && (
              <>
                <div className={styles.recetasHeader}>
                  <span className={styles.recetasTitle}>RECETAS RECIENTES</span>
                  <button className={styles.recetasVerTodas} onClick={() => navigate('/store/recetas')}>Ver todas</button>
                </div>

                {allRecetas.slice(0, 4).map((r: Receta) => {
                  const isActive = r.estado === 'activa';
                  const isChecked = selectedRecetaId === r.id;
                  const cardClass = !isActive ? styles.recetaRadioDisabled : isChecked ? styles.recetaRadioChecked : styles.recetaRadio;

                  return (
                    <div
                      key={r.id}
                      className={cardClass}
                      onClick={() => { if (isActive) setSelectedRecetaId(isChecked ? null : r.id); }}
                    >
                      <div className={isChecked ? styles.radioDotChecked : styles.radioDot} />
                      <div className={styles.recetaRadioInfo}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={styles.recetaRadioName}>{r.medico_nombre || 'Médico'}</span>
                          <span className={isActive ? styles.badgeVigente : styles.badgeVencida}>
                            {isActive ? 'Vigente' : 'Vencida'}
                          </span>
                        </div>
                        <div className={styles.recetaRadioDate}>
                          Subida el {fmtDate(r.fecha_emision)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Warnings */}
            {((hasMicro && !recetaMicro) || (hasMacro && !recetaMacro)) && !recipeFile && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>No tienes receta activa. Sube una para continuar.</span>
              </div>
            )}
            {hasMicro && recetaMicroConSaldo && cartMicroCaps > recetaMicroConSaldo.saldo_micro && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Pides {cartMicroCaps} caps micro pero tu saldo es {recetaMicroConSaldo.saldo_micro}. El admin decidirá.</span>
              </div>
            )}
            {hasMicro && recetaMicroConSaldo && recetaMicroConSaldo.saldo_micro === 0 && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Tu saldo de microdosis está agotado.</span>
              </div>
            )}
            {hasMacro && recetaMacroConSaldo && recetaMacroConSaldo.saldo_macro < 1 && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>No te quedan dispensaciones de macrodosis.</span>
              </div>
            )}
            {hasMacro && recetaMacroConSaldo && recetaMacroGramsMax > 0 && cartMacroGrams > recetaMacroGramsMax && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Pides {cartMacroGrams}g macro pero tu receta autoriza {recetaMacroGramsMax}g.</span>
              </div>
            )}
            {hasMicro && recetaMicroConSaldo && recetaMicroConSaldo.gramaje_micro && cartMicroGramajes.length > 0
              && !cartMicroGramajes.some(g => g?.replace(/\s/g, '').toLowerCase() === recetaMicroConSaldo.gramaje_micro?.replace(/\s/g, '').toLowerCase()) && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Tu receta indica {recetaMicroConSaldo.gramaje_micro} pero pediste {cartMicroGramajes.join(', ')}.</span>
              </div>
            )}

            {/* Notes */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                <Leaf size={14} weight="bold" /> Notas adicionales (Opcional)
              </label>
              <textarea
                className={styles.formTextarea}
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Instrucciones para la entrega o notas clínicas relevantes..."
                rows={3}
              />
            </div>
          </>
        )}

        {/* ─── Step: Resumen ─── */}
        {step === 'resumen' && (
          <>
            <h2 className={styles.sectionTitle}>Resumen</h2>
            <p className={styles.sectionSubtitle}>Revisa los detalles antes de enviar.</p>

            <div className={styles.summaryList}>
              {cart.map(item => {
                const microData = item.category === 'Microdosis'
                  ? catalog.microdosis.find(m => m.gramaje === item.gramaje)
                  : null;
                const macroData = item.category === 'Macrodosis'
                  ? catalog.macrodosis.find(m => m.key === item.producto)
                  : null;
                const imgUrl = microData?.imageUrl || macroData?.imageUrl;

                return (
                  <div key={item.id} className={styles.summaryItem}>
                    <div className={styles.summaryThumb}>
                      {imgUrl ? (
                        <img src={imgUrl} alt={item.displayLabel} />
                      ) : item.category === 'Microdosis' ? (
                        <Pill size={24} weight="duotone" />
                      ) : (
                        <Plant size={24} weight="duotone" />
                      )}
                    </div>
                    <div className={styles.summaryItemInfo}>
                      <div className={styles.summaryItemName}>{item.displayLabel}</div>
                      <div className={styles.summaryItemSub}>
                        {item.category === 'Microdosis' ? `${item.gramaje} · ${item.capsulas} cápsulas` : macroData?.description || item.category}
                      </div>
                    </div>
                    <div className={styles.summaryItemRight}>
                      <div className={styles.summaryItemPrice}>{formatCLP(item.lineTotal)}</div>
                      <div className={styles.summaryItemQty}>x{item.quantity || 1}</div>
                    </div>
                    <button className={styles.summaryItemRemove} onClick={() => removeFromCart(item.id)}>
                      <Trash size={16} weight="bold" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                <Leaf size={14} weight="bold" /> Notas adicionales (Opcional)
              </label>
              <textarea
                className={styles.formTextarea}
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Instrucciones para la entrega o notas clínicas relevantes..."
                rows={3}
              />
            </div>

            {/* Pricing breakdown */}
            <div className={styles.pricingBreakdown}>
              <div className={styles.pricingRow}>
                <span className={styles.pricingLabel}>Subtotal</span>
                <span className={styles.pricingValue}>{formatCLP(cartTotal)}</span>
              </div>
              <div className={styles.pricingDivider} />
              <div className={styles.pricingRow}>
                <span className={styles.pricingTotalLabel}>Total</span>
                <span className={styles.pricingTotal}>{formatCLP(cartTotal)} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>CLP</span></span>
              </div>
            </div>

            <p className={styles.legalText}>Al enviar aceptas los términos de uso responsable.</p>
          </>
        )}

        {/* ─── Cart preview (floating) ─── */}
        {cart.length > 0 && step !== 'resumen' && (
          <div className={styles.cartPreview}>
            <p className={styles.cartPreviewTitle}>
              <ShoppingCart size={14} weight="bold" /> Carrito ({cart.length})
            </p>
            {cart.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <span className={styles.cartItemLabel}>{item.displayLabel}</span>
                <span className={styles.cartItemPrice}>{formatCLP(item.lineTotal)}</span>
                <button className={styles.cartItemRemove} onClick={() => removeFromCart(item.id)}>
                  <Trash size={14} weight="bold" />
                </button>
              </div>
            ))}
            <div className={styles.cartTotal}>
              <span className={styles.cartTotalLabel}>Total</span>
              <span className={styles.cartTotalPrice}>{formatCLP(cartTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom buttons ─── */}
      <div className={styles.buttonRow}>
        {stepIndex > 0 && (
          <button className={styles.btnSecondary} onClick={goBack}>Atrás</button>
        )}
        {step === 'resumen' ? (
          <button className={styles.btnPrimary} onClick={handleSubmit} disabled={submitting || cart.length === 0}>
            <PaperPlaneTilt size={16} weight="bold" /> Enviar Solicitud
          </button>
        ) : (
          <button className={styles.btnPrimary} onClick={goNext} disabled={step === 'recetas' && !canGoNext()}>
            {cart.length === 0 && (step === 'micro' || step === 'macro') ? 'Omitir' : 'Continuar'}
            <ArrowRight size={16} weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SolicitudForm;
