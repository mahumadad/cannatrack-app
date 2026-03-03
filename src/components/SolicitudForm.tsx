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
const ALL_STEPS: Step[] = ['micro', 'macro', 'recetas', 'resumen'];

// Per-step theme colors (progress is computed dynamically)
const STEP_COLORS: Record<Step, { color: string; light: string; label: string }> = {
  micro:   { color: '#14b858', light: '#f0fdf4', label: 'Selección Microdosis' },
  macro:   { color: '#5048e5', light: '#f0efff', label: 'Selección Macrodosis' },
  recetas: { color: '#5048e5', light: '#f0efff', label: 'Adjuntar Receta' },
  resumen: { color: '#a57f50', light: '#fbfaf9', label: 'Finalizar' },
};


/** Parse grams from string like "0.2g", "0.2 g", "200mg" */
const parseGrams = (str: string): number => {
  if (!str) return 0;
  const s = str.trim().toLowerCase();
  const mgMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*mg$/);
  if (mgMatch) return parseFloat(mgMatch[1].replace(',', '.')) / 1000;
  const gMatch = s.match(/(\d+(?:[.,]\d+)?)\s*g/);
  if (gMatch) return parseFloat(gMatch[1].replace(',', '.'));
  return 0;
};

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
        if (bestFit) {
          setSelectedMacro(bestFit.key);
          // Auto-add suggested macro to cart if cart has no macros yet
          if (!cart.some(i => i.category === 'Macrodosis')) {
            setCart(prev => [...prev, {
              id: `macro-${bestFit.key}-${Date.now()}`,
              category: 'Macrodosis',
              producto: bestFit.key,
              displayLabel: bestFit.label,
              unitPrice: bestFit.price,
              quantity: 1,
              lineTotal: bestFit.price
            } as CartItem]);
          }
        }
      }
    }

    setPreselected(true);
  }, [catalog, recetaMicroConSaldo, recetaMacroConSaldo, preselected]);

  const hasMicro = cart.some(i => i.category === 'Microdosis');
  const hasMacro = cart.some(i => i.category === 'Macrodosis');

  // Skip recetas step if user already has active receta covering their cart
  const recetaCoversMicro = !hasMicro || !!recetaMicro;
  const recetaCoversMacro = !hasMacro || !!recetaMacro;
  const skipRecetas = recetaCoversMicro && recetaCoversMacro && hasAnyReceta;
  const steps: Step[] = skipRecetas
    ? ALL_STEPS.filter(s => s !== 'recetas')
    : ALL_STEPS;
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

  // Accumulated grams
  const cartMicroTotalGrams = cart.filter(i => i.category === 'Microdosis').reduce((sum, i) => {
    return sum + parseGrams(i.gramaje || '') * parseInt(i.capsulas || '0') * (i.quantity || 1);
  }, 0);
  const recetaMacroTotalGramsAuth = recetaMacroConSaldo
    ? recetaMacroGramsMax * (recetaMacroConSaldo.saldo_macro || 0)
    : 0;

  // Micro: total grams authorized by receta saldo
  const recetaMicroGramPerCap = recetaMicroConSaldo?.gramaje_micro ? parseGrams(recetaMicroConSaldo.gramaje_micro) : 0;
  const recetaMicroTotalGramsAuth = recetaMicroConSaldo
    ? recetaMicroGramPerCap * (recetaMicroConSaldo.saldo_micro || 0)
    : 0;
  const microGramsExceeded = recetaMicroTotalGramsAuth > 0 && cartMicroTotalGrams > recetaMicroTotalGramsAuth;
  // Micro equivalences: how many "receta doses" the cart represents
  const microEquiv = recetaMicroGramPerCap > 0 && cartMicroTotalGrams > 0
    ? Math.ceil(cartMicroTotalGrams / recetaMicroGramPerCap)
    : cartMicroCaps;

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
  const stepIndex = steps.indexOf(step);
  const stepProgress = `${Math.round(((stepIndex + 1) / steps.length) * 100)}%`;
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
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const goBack = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
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
    // Replace history so back button goes to store, not back to this form
    window.history.replaceState(null, '', '/store');
    return (
      <div className={styles.page}>
        <div className={styles.successScreen}>
          <div className={styles.successIcon}>
            <CheckCircle size={40} weight="bold" />
          </div>
          <h2 className={styles.successTitle}>Solicitud enviada</h2>
          <p className={styles.successSubtitle}>Tu solicitud ha sido recibida y está en revisión</p>
          <div className={styles.successId}>{success}</div>
          <button className={styles.btnPrimary} style={{ width: 'auto', padding: '12px 32px', background: 'var(--gradient-primary)' }} onClick={() => navigate('/store/solicitudes', { replace: true })}>
            Ver mis solicitudes
          </button>
          <button className={styles.btnSecondary} style={{ width: 'auto', padding: '10px 24px', marginTop: 8 }} onClick={() => navigate('/store', { replace: true })}>
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
          <span className={styles.stepCounterText}>PASO {stepIndex + 1} de {steps.length}</span>
          <span className={styles.stepCounterRight}>{stepTheme.label}</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: stepProgress }} />
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
                  Saldo: <strong>{recetaMicroConSaldo.saldo_micro} caps</strong>
                  {recetaMicroConSaldo.gramaje_micro && <> · Gramaje: <strong>{recetaMicroConSaldo.gramaje_micro}/cap</strong></>}
                  {recetaMicroConSaldo.total_micro_autorizado && <> · Total: {recetaMicroConSaldo.total_micro_autorizado} caps</>}
                  {cartMicroCaps > 0 && <> · <strong>En carrito: {cartMicroCaps} caps</strong></>}
                </div>
              </div>
            )}

            {catalog.microdosis.map((m: MicrodosisOption) => {
              const isRecetaMatch = recetaMicroConSaldo?.gramaje_micro
                && m.gramaje.replace(/\s/g, '').toLowerCase() === recetaMicroConSaldo.gramaje_micro.replace(/\s/g, '').toLowerCase();
              const needsUpdate = recetaMicroConSaldo?.gramaje_micro && !isRecetaMatch;
              const isSelected = selectedGramaje === m.gramaje;

              return (
                <div
                  key={m.gramaje}
                  className={`${styles.microCard} ${isSelected ? styles.microCardActive : ''}`}
                  onClick={() => {
                    setSelectedGramaje(isSelected ? null : m.gramaje);
                    setSelectedCapsulas(null);
                    setMicroQty(1);
                  }}
                >
                  <div className={styles.microCardHeader}>
                    <div />
                    {isRecetaMatch && (
                      <span className={styles.badgeReceta}>
                        <Star size={10} weight="fill" /> Receta Activa
                      </span>
                    )}
                    {needsUpdate && (
                      <span className={styles.badgePautaGray}>Requiere actualización</span>
                    )}
                  </div>

                  <div className={styles.microCardDose}>{m.gramaje} / cápsula</div>
                  <div className={styles.microCardSpecies}>{m.description || 'Psilocybe Cubensis'}</div>

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
                  {recetaMacroGramsMax > 0 ? `${recetaMacroGramsMax}g/disp.` : ''} · {recetaMacroConSaldo.saldo_macro} disp. restantes
                </span>
              )}
            </div>
            <p className={styles.sectionSubtitle}>Elige tus productos de macrodosis según tu receta médica. Puedes combinar productos.</p>

            {recetaMacroConSaldo && recetaMacroGramsMax > 0 && (
              <div className={styles.infoBanner}>
                <div className={styles.infoBannerIcon}><Star size={18} weight="fill" /></div>
                <div className={styles.infoBannerText}>
                  <div className={styles.infoBannerLabel}>Receta activa</div>
                  {recetaMacroGramsMax}g por dispensación · {recetaMacroConSaldo.saldo_macro} dispensaciones restantes · Total autorizado: {recetaMacroTotalGramsAuth}g
                  {cartMacroGrams > 0 && <> · <strong>En carrito: {cartMacroGrams}g</strong></>}
                </div>
              </div>
            )}

            {cartMacroGrams > 0 && recetaMacroTotalGramsAuth > 0 && cartMacroGrams > recetaMacroTotalGramsAuth && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Pides {cartMacroGrams}g pero tu receta autoriza máximo {recetaMacroTotalGramsAuth}g en total ({recetaMacroGramsMax}g × {recetaMacroConSaldo?.saldo_macro} disp.). El admin decidirá.</span>
              </div>
            )}

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
              const countInCart = cart.filter(c => c.producto === m.key).length;
              const isSuggested = m.key === selectedMacro;

              return (
                <div key={m.key} className={`${styles.macroCard}${isSuggested ? ` ${styles.macroCardSuggested}` : ''}${countInCart > 0 ? ` ${styles.macroCardInCart}` : ''}`}>
                  {isSuggested && <span className={styles.badgeSuggested}>Sugerido</span>}
                  {!isSuggested && idx === 0 && <span className={styles.badgePopular}>Popular</span>}

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
                    <button className={styles.macroCardBtn} onClick={() => addMacroToCart(m.key)}>
                      + Agregar{countInCart > 0 ? ` (${countInCart})` : ''}
                    </button>
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
              Sube una foto clara de tu receta médica vigente para continuar.
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

            {/* Warnings */}
            {((hasMicro && !recetaMicro) || (hasMacro && !recetaMacro)) && !recipeFile && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>No tienes receta activa. Sube una para continuar.</span>
              </div>
            )}
            {hasMicro && recetaMicroConSaldo && microEquiv > recetaMicroConSaldo.saldo_micro && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Tu pedido equivale a {microEquiv} dosis de {recetaMicroConSaldo.gramaje_micro} (saldo: {recetaMicroConSaldo.saldo_micro}). El admin decidirá.</span>
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
            {hasMacro && recetaMacroConSaldo && recetaMacroTotalGramsAuth > 0 && cartMacroGrams > recetaMacroTotalGramsAuth && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Pides {cartMacroGrams}g macro pero tu receta autoriza máximo {recetaMacroTotalGramsAuth}g ({recetaMacroGramsMax}g × {recetaMacroConSaldo.saldo_macro} disp.).</span>
              </div>
            )}
            {hasMicro && recetaMicroConSaldo && microGramsExceeded && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Pides {cartMicroTotalGrams.toFixed(1)}g en micro pero tu receta autoriza máximo {recetaMicroTotalGramsAuth.toFixed(1)}g ({recetaMicroConSaldo.gramaje_micro} × {recetaMicroConSaldo.saldo_micro} caps). El admin decidirá.</span>
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
              {cartMicroTotalGrams > 0 && (
                <div className={styles.pricingRow}>
                  <span className={styles.pricingLabel}>Microdosis</span>
                  <span className={styles.pricingValue}>
                    {cartMicroCaps} caps · {cartMicroTotalGrams.toFixed(2)}g
                    {recetaMicroConSaldo && microEquiv !== cartMicroCaps && (
                      <> · {microEquiv} dosis de {recetaMicroConSaldo.gramaje_micro}</>
                    )}
                  </span>
                </div>
              )}
              {cartMacroGrams > 0 && (
                <div className={styles.pricingRow}>
                  <span className={styles.pricingLabel}>Macrodosis</span>
                  <span className={styles.pricingValue}>{cartMacroGrams}g total</span>
                </div>
              )}
              <div className={styles.pricingDivider} />
              <div className={styles.pricingRow}>
                <span className={styles.pricingTotalLabel}>Total</span>
                <span className={styles.pricingTotal}>{formatCLP(cartTotal)} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>CLP</span></span>
              </div>
            </div>

            {/* Warnings in summary */}
            {hasMicro && recetaMicroConSaldo && microEquiv > recetaMicroConSaldo.saldo_micro && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Equivalencia: {microEquiv} dosis de {recetaMicroConSaldo.gramaje_micro} (saldo: {recetaMicroConSaldo.saldo_micro}).</span>
              </div>
            )}
            {hasMacro && recetaMacroConSaldo && recetaMacroTotalGramsAuth > 0 && cartMacroGrams > recetaMacroTotalGramsAuth && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Macro: {cartMacroGrams}g (autorizado: {recetaMacroTotalGramsAuth}g).</span>
              </div>
            )}

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
            {(cartMicroTotalGrams > 0 || cartMacroGrams > 0) && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                {cartMicroTotalGrams > 0 && <span>Micro: {cartMicroTotalGrams.toFixed(2)}g ({cartMicroCaps} caps)</span>}
                {cartMicroTotalGrams > 0 && cartMacroGrams > 0 && <span> · </span>}
                {cartMacroGrams > 0 && <span>Macro: {cartMacroGrams}g</span>}
              </div>
            )}
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
