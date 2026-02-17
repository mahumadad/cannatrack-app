import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { trackEvent } from '../utils/analytics';
import { useToast } from './Toast';
import { useUser } from '../hooks/useUser';
import { useRecetas } from '../hooks/useRecetas';
import useSwipeBack from '../hooks/useSwipeBack';
import { ArrowLeft, Check, UploadSimple, ShoppingCart, Trash, CheckCircle, Pill, Warning, CalendarBlank, User } from '@phosphor-icons/react';
import styles from './SolicitudForm.module.css';
import { formatCLP } from '../utils/formatters';
import type { ProductCatalog, MicrodosisOption, MacrodosisOption, CartItem, Receta } from '../types';

type Step = 'micro' | 'macro' | 'recetas' | 'resumen';
const STEPS: Step[] = ['micro', 'macro', 'recetas', 'resumen'];

const STEP_LABELS: Record<Step, string> = {
  micro: 'Microdosis',
  macro: 'Macrodosis',
  recetas: 'Recetas y contacto',
  resumen: 'Resumen'
};

const SolicitudForm: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast()!;
  const { user } = useUser();
  const { recetas: allRecetas, loading: loadingRecetas } = useRecetas(user?.id);
  useSwipeBack();
  const recetasActivas = allRecetas.filter((r: Receta) => r.estado === 'activa');

  const [catalog, setCatalog] = useState<ProductCatalog | null>(null);
  const [step, setStep] = useState<Step>('micro');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [preselected, setPreselected] = useState(false); // track if we auto-selected

  // Micro selection state
  const [selectedGramaje, setSelectedGramaje] = useState<string | null>(null);
  const [selectedCapsulas, setSelectedCapsulas] = useState<string | null>(null);

  // Macro selection state
  const [selectedMacro, setSelectedMacro] = useState<string | null>(null);

  // Recetas & contact
  const [recipeMicro, setRecipeMicro] = useState<string | null>(null);
  const [recipeMicroName, setRecipeMicroName] = useState('');
  const [recipeMacro, setRecipeMacro] = useState<string | null>(null);
  const [recipeMacroName, setRecipeMacroName] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');

  const microFileRef = useRef<HTMLInputElement>(null);
  const macroFileRef = useRef<HTMLInputElement>(null);

  // Derived: find receta for micro and macro from all active recetas
  // Con saldo — para banners y auto-selección de gramaje
  const recetaMicroConSaldo = recetasActivas.find(r => r.total_micro_autorizado > 0 && r.saldo_micro > 0) || null;
  const recetaMacroConSaldo = recetasActivas.find(r => r.total_macro_autorizado > 0 && r.saldo_macro > 0) || null;
  // Para validación: basta que tenga cualquier receta activa
  const hasAnyReceta = recetasActivas.length > 0;
  const recetaMicro = hasAnyReceta ? recetasActivas[0] : null;
  const recetaMacro = hasAnyReceta ? recetasActivas[0] : null;

  useEffect(() => {
    loadCatalog();
    if (user) {
      if (user.email) setEmail(user.email);
      loadContactInfo(user.id);
    }
  }, [user]);

  const loadCatalog = async () => {
    try {
      const data = await api.get('/api/catalog/products');
      setCatalog(data);
    } catch {
      toast.error('Error al cargar catálogo');
    }
  };

  const loadContactInfo = async (userId: string) => {
    try {
      const profile = await api.get(`/api/shopify/profile/${userId}`, { skipAuthRedirect: true });
      if (profile?.emailAddress?.emailAddress) setEmail(profile.emailAddress.emailAddress);
      if (profile?.phoneNumber?.phoneNumber) setTelefono(profile.phoneNumber.phoneNumber);
    } catch {
      // Shopify data is supplementary — silently ignore
    }
  };

  // Auto-select gramaje and max capsulas from active micro receta once catalog loads
  useEffect(() => {
    if (!catalog || preselected) return;

    // Auto-select micro gramaje if receta has it
    if (recetaMicroConSaldo?.gramaje_micro && recetaMicroConSaldo.saldo_micro > 0) {
      const matchingGramaje = catalog.microdosis.find(m =>
        m.gramaje.replace(/\s/g, '').toLowerCase() === recetaMicroConSaldo.gramaje_micro!.replace(/\s/g, '').toLowerCase()
      );
      if (matchingGramaje) {
        setSelectedGramaje(matchingGramaje.gramaje);

        // Find max capsulas that fits within saldo
        const sortedOptions = [...matchingGramaje.options].sort(
          (a, b) => parseInt(b.capsulas) - parseInt(a.capsulas)
        );
        const bestFit = sortedOptions.find(o => parseInt(o.capsulas) <= recetaMicroConSaldo.saldo_micro);
        if (bestFit) {
          setSelectedCapsulas(bestFit.capsulas);
        } else {
          // All options exceed saldo — select smallest
          const smallest = sortedOptions[sortedOptions.length - 1];
          if (smallest) setSelectedCapsulas(smallest.capsulas);
        }
      }
    }

    // Auto-select macro product: largest that fits within gramaje_macro
    if (recetaMacroConSaldo?.gramaje_macro && recetaMacroConSaldo.saldo_macro > 0) {
      const maxGrams = parseFloat(recetaMacroConSaldo.gramaje_macro.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
      if (maxGrams > 0) {
        const sorted = [...catalog.macrodosis].sort((a, b) => (b.grams || 0) - (a.grams || 0));
        const bestFit = sorted.find(m => (m.grams || 0) <= maxGrams);
        if (bestFit) {
          setSelectedMacro(bestFit.key);
        }
      }
    }

    setPreselected(true);
  }, [catalog, recetaMicroConSaldo, recetaMacroConSaldo, preselected]);

  const hasMicro = cart.some(i => i.category === 'Microdosis');
  const hasMacro = cart.some(i => i.category === 'Macrodosis');
  const cartTotal = cart.reduce((sum, i) => sum + i.lineTotal, 0);

  // Cart quantities for saldo warnings
  const cartMicroCaps = cart.filter(i => i.category === 'Microdosis').reduce((sum, i) => sum + parseInt(i.capsulas || '0') * (i.quantity || 1), 0);
  const cartMacroUnits = cart.filter(i => i.category === 'Macrodosis').reduce((sum, i) => sum + (i.quantity || 1), 0);
  // Total grams of macro in cart (for gramaje validation)
  const cartMacroGrams = cart.filter(i => i.category === 'Macrodosis').reduce((sum, i) => {
    const producto = catalog?.macrodosis.find(m => m.key === i.producto);
    return sum + (producto?.grams || 0) * (i.quantity || 1);
  }, 0);
  // Max grams authorized per dispensation by receta
  const recetaMacroGramsMax = recetaMacroConSaldo?.gramaje_macro
    ? parseFloat(recetaMacroConSaldo.gramaje_macro.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0
    : 0;
  // Gramajes in cart for mismatch detection
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
      quantity: 1,
      lineTotal: option.price
    };

    setCart(prev => [...prev, item]);
    setSelectedGramaje(null);
    setSelectedCapsulas(null);
    toast.success('Agregado al carrito');
  };

  const addMacroToCart = () => {
    if (!selectedMacro || !catalog) return;
    const producto = catalog.macrodosis.find(m => m.key === selectedMacro);
    if (!producto) return;

    const item: CartItem = {
      id: `macro-${selectedMacro}-${Date.now()}`,
      category: 'Macrodosis',
      producto: selectedMacro,
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
    if (!email) {
      toast.error('Email es requerido');
      return;
    }
    // Solo exigir receta si no hay receta activa para ese tipo
    if (hasMicro && !recetaMicro && !recipeMicro) {
      toast.error('Sube la receta de microdosis');
      return;
    }
    if (hasMacro && !recetaMacro && !recipeMacro) {
      toast.error('Sube la receta de macrodosis');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.post('/api/solicitudes', {
        cart,
        email,
        telefono: telefono || null,
        notas: notas || null,
        recipeMicro,
        recipeMacro
      });
      trackEvent('solicitud_created', { items: cart.length });
      setSuccess(result.submission_id);
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Navigation ────────────────────────

  const stepIndex = STEPS.indexOf(step);
  const canGoNext = () => {
    if (step === 'recetas') {
      if (loadingRecetas) return false; // Esperar a que carguen las recetas
      // Solo exigir receta si no hay receta activa para ese tipo
      if (hasMicro && !recetaMicro && !recipeMicro) return false;
      if (hasMacro && !recetaMacro && !recipeMacro) return false;
      return !!email;
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
          <button className={styles.btnPrimary} style={{ width: 'auto', padding: '12px 32px' }} onClick={() => navigate('/store/solicitudes')}>
            Ver mis solicitudes
          </button>
        </div>
      </div>
    );
  }

  const selectedGramajeData = catalog.microdosis.find(m => m.gramaje === selectedGramaje);

  return (
    <div className={styles.page}>
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

      {/* Stepper */}
      <div className={styles.stepper}>
        {STEPS.map((s, i) => (
          <div key={s} className={`${styles.step} ${i === stepIndex ? styles.stepActive : ''} ${i < stepIndex ? styles.stepCompleted : ''}`} />
        ))}
      </div>
      <p className={styles.stepLabel}>{STEP_LABELS[step]}</p>

      <div className={styles.content}>
        {/* ─── Step: Micro ─── */}
        {step === 'micro' && (
          <>
            <h2 className={styles.sectionTitle}>Microdosis</h2>
            <p className={styles.sectionSubtitle}>Selecciona gramaje y cantidad de cápsulas</p>

            {/* Active receta banner for micro */}
            {recetaMicroConSaldo && (
              <div className={styles.recetaBanner}>
                <div className={styles.recetaBannerIcon}>
                  <Pill size={16} weight="fill" />
                </div>
                <div className={styles.recetaBannerText}>
                  <div className={styles.recetaBannerLabel}>Receta activa</div>
                  Saldo disponible: <span className={styles.recetaBannerSaldo}>{recetaMicroConSaldo.saldo_micro} caps</span>
                  {recetaMicroConSaldo.gramaje_micro && <> · Gramaje: <strong>{recetaMicroConSaldo.gramaje_micro}</strong></>}
                </div>
              </div>
            )}

            <div className={styles.productGrid}>
              {catalog.microdosis.map((m: MicrodosisOption) => {
                const isRecetaGramaje = recetaMicroConSaldo?.gramaje_micro
                  && m.gramaje.replace(/\s/g, '').toLowerCase() === recetaMicroConSaldo.gramaje_micro.replace(/\s/g, '').toLowerCase();
                const isSelected = selectedGramaje === m.gramaje;
                return (
                  <div
                    key={m.gramaje}
                    className={`${styles.productCard} ${isSelected ? styles.productCardSelected : ''} ${isRecetaGramaje && !isSelected && preselected ? styles.productCardRecommended : ''}`}
                    onClick={() => { setSelectedGramaje(m.gramaje); setSelectedCapsulas(null); }}
                  >
                    <div className={styles.productCardInfo}>
                      <span className={styles.productCardName}>{m.label}</span>
                      <span className={styles.productCardPrice}>
                        desde {formatCLP(Math.min(...m.options.map(o => o.price)))}
                      </span>
                    </div>
                    <div className={`${styles.productCardCheck} ${isSelected ? styles.productCardCheckSelected : ''}`}>
                      {isSelected && <Check size={14} weight="bold" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedGramajeData && (
              <>
                <p className={styles.sectionSubtitle}>Cantidad de cápsulas</p>
                <div className={styles.capsulasGrid}>
                  {selectedGramajeData.options.map(opt => {
                    const isSelected = selectedCapsulas === opt.capsulas;
                    // Determine if this is the recommended (max fit) capsulas for active receta
                    const isRecommended = (() => {
                      if (!recetaMicroConSaldo || !preselected) return false;
                      const recetaGramajeMatch = recetaMicroConSaldo.gramaje_micro
                        && selectedGramaje?.replace(/\s/g, '').toLowerCase() === recetaMicroConSaldo.gramaje_micro.replace(/\s/g, '').toLowerCase();
                      if (!recetaGramajeMatch) return false;
                      // Find the max option that fits saldo
                      const sorted = [...selectedGramajeData!.options].sort((a, b) => parseInt(b.capsulas) - parseInt(a.capsulas));
                      const bestFit = sorted.find(o => parseInt(o.capsulas) <= recetaMicroConSaldo.saldo_micro);
                      if (bestFit) return opt.capsulas === bestFit.capsulas;
                      // If no option fits, recommend smallest
                      return opt.capsulas === sorted[sorted.length - 1]?.capsulas;
                    })();
                    return (
                      <button
                        key={opt.capsulas}
                        className={`${styles.capsulaChip} ${isSelected ? styles.capsulaChipSelected : ''} ${isRecommended && !isSelected ? styles.capsulaChipRecommended : ''}`}
                        onClick={() => setSelectedCapsulas(opt.capsulas)}
                      >
                        {opt.capsulas} caps · {formatCLP(opt.price)}
                      </button>
                    );
                  })}
                </div>

                {selectedCapsulas && (
                  <button className={styles.addToCartBtn} onClick={addMicroToCart}>
                    <ShoppingCart size={16} weight="bold" /> Agregar al carrito
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* ─── Step: Macro ─── */}
        {step === 'macro' && (
          <>
            <h2 className={styles.sectionTitle}>Macrodosis</h2>
            <p className={styles.sectionSubtitle}>Selecciona el producto</p>

            {/* Active receta banner for macro */}
            {recetaMacroConSaldo && (
              <div className={styles.recetaBanner}>
                <div className={styles.recetaBannerIcon}>
                  <Pill size={16} weight="fill" />
                </div>
                <div className={styles.recetaBannerText}>
                  <div className={styles.recetaBannerLabel}>Receta activa</div>
                  {recetaMacroConSaldo.gramaje_macro
                    ? <>Autorizado: <span className={styles.recetaBannerSaldo}>{recetaMacroConSaldo.gramaje_macro}</span> · </>
                    : null
                  }
                  Dispensaciones: <span className={styles.recetaBannerSaldo}>{recetaMacroConSaldo.saldo_macro}</span>
                  {cartMacroGrams > 0 && (
                    <> · En carrito: <strong>{cartMacroGrams}g</strong>
                      {recetaMacroGramsMax > 0 && <> de {recetaMacroGramsMax}g</>}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className={styles.productGrid}>
              {catalog.macrodosis.map((m: MacrodosisOption) => {
                const isSelected = selectedMacro === m.key;
                // Recommended: largest product that fits within receta gramaje
                const isRecommended = (() => {
                  if (!recetaMacroConSaldo?.gramaje_macro || !preselected) return false;
                  const maxGrams = parseFloat(recetaMacroConSaldo.gramaje_macro.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
                  if (maxGrams <= 0) return false;
                  const sorted = [...catalog!.macrodosis].sort((a, b) => (b.grams || 0) - (a.grams || 0));
                  const bestFit = sorted.find(p => (p.grams || 0) <= maxGrams);
                  return bestFit?.key === m.key;
                })();
                return (
                  <div
                    key={m.key}
                    className={`${styles.productCard} ${isSelected ? styles.productCardSelected : ''} ${isRecommended && !isSelected && preselected ? styles.productCardRecommended : ''}`}
                    onClick={() => setSelectedMacro(m.key)}
                  >
                    <div className={styles.productCardInfo}>
                      <span className={styles.productCardName}>{m.label}</span>
                      <span className={styles.productCardPrice}>{formatCLP(m.price)}</span>
                    </div>
                    <div className={`${styles.productCardCheck} ${isSelected ? styles.productCardCheckSelected : ''}`}>
                      {isSelected && <Check size={14} weight="bold" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedMacro && (
              <button className={styles.addToCartBtn} onClick={addMacroToCart}>
                <ShoppingCart size={16} weight="bold" /> Agregar al carrito
              </button>
            )}
          </>
        )}

        {/* ─── Step: Recetas & Contacto ─── */}
        {step === 'recetas' && (
          <>
            {/* ── Receta summary cards ── */}
            {recetasActivas.length > 0 && (
              <>
                <h2 className={styles.sectionTitle}>
                  {recetasActivas.length > 1 ? 'Tus recetas activas' : 'Tu receta activa'}
                </h2>
                <div className={styles.recetaCards}>
                  {recetasActivas.map((r: Receta) => {
                    const fmtDate = (d: string | null) => {
                      if (!d) return '—';
                      const [y, m, day] = d.split('-');
                      return `${day}/${m}/${y}`;
                    };
                    const usedMicro = r.total_micro_autorizado - r.saldo_micro;
                    const usedMacro = r.total_macro_autorizado - r.saldo_macro;
                    const hasMicroAuth = r.total_micro_autorizado > 0;
                    const hasMacroAuth = r.total_macro_autorizado > 0;
                    // Detect type: semantic data first, file paths only as last resort
                    const hasSemantic = hasMicroAuth || hasMacroAuth || !!r.gramaje_micro || !!r.gramaje_macro;
                    const isMicroReceta = hasMicroAuth || !!r.gramaje_micro || (!hasSemantic && !!r.archivo_micro_path);
                    const isMacroReceta = hasMacroAuth || !!r.gramaje_macro || (!hasSemantic && !!r.archivo_macro_path);

                    return (
                      <div key={r.id} className={styles.recetaCard}>
                        <div className={styles.recetaCardHeader}>
                          <Pill size={16} weight="fill" />
                          <span className={styles.recetaCardBadge}>Activa</span>
                          {isMicroReceta && <span className={styles.recetaCardTypeBadge}>Micro</span>}
                          {isMacroReceta && <span className={styles.recetaCardTypeBadge}>Macro</span>}
                        </div>

                        <div className={styles.recetaCardRow}>
                          <User size={14} weight="bold" />
                          <span>{r.medico_nombre || 'Médico no registrado'}</span>
                        </div>

                        <div className={styles.recetaCardRow}>
                          <CalendarBlank size={14} weight="bold" />
                          <span>Emisión: {fmtDate(r.fecha_emision)}</span>
                          <span className={styles.recetaCardSep}>·</span>
                          <span>Vence: {fmtDate(r.fecha_vencimiento)}</span>
                        </div>

                        {isMicroReceta && (
                          <div className={styles.recetaCardDosis}>
                            <span className={styles.recetaCardDosisLabel}>Micro</span>
                            {r.gramaje_micro && <span className={styles.recetaCardGramaje}>{r.gramaje_micro}</span>}
                            {hasMicroAuth ? (
                              <>
                                <span className={styles.recetaCardDosisValue}>
                                  {r.saldo_micro} de {r.total_micro_autorizado} caps
                                </span>
                                {usedMicro > 0 && <span className={styles.recetaCardUsed}>({usedMicro} usadas)</span>}
                              </>
                            ) : (
                              <span className={styles.recetaCardUsed}>sin cantidad asignada</span>
                            )}
                          </div>
                        )}

                        {isMacroReceta && (
                          <div className={styles.recetaCardDosis}>
                            <span className={styles.recetaCardDosisLabel}>Macro</span>
                            {r.gramaje_macro && <span className={styles.recetaCardGramaje}>{r.gramaje_macro}</span>}
                            {hasMacroAuth ? (
                              <>
                                <span className={styles.recetaCardDosisValue}>
                                  {r.saldo_macro} de {r.total_macro_autorizado} uds
                                </span>
                                {usedMacro > 0 && <span className={styles.recetaCardUsed}>({usedMacro} usadas)</span>}
                              </>
                            ) : (
                              <span className={styles.recetaCardUsed}>sin cantidad asignada</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className={styles.sectionSubtitle} style={{ marginTop: 4 }}>
                  Puedes subir otra receta a continuación.
                </p>
              </>
            )}

            {/* ── Warnings ── */}
            {hasMicro && !recetaMicro && !recipeMicro && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>No tienes receta de microdosis activa. Sube una para continuar.</span>
              </div>
            )}
            {hasMacro && !recetaMacro && !recipeMacro && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>No tienes receta de macrodosis activa. Sube una para continuar.</span>
              </div>
            )}
            {hasMicro && recetaMicroConSaldo && cartMicroCaps > recetaMicroConSaldo.saldo_micro && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Pides {cartMicroCaps} caps micro pero tu saldo es {recetaMicroConSaldo.saldo_micro}. El admin decidirá si aprueba.</span>
              </div>
            )}
            {hasMicro && recetaMicroConSaldo && recetaMicroConSaldo.saldo_micro === 0 && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Tu saldo de microdosis está agotado. El admin decidirá si aprueba.</span>
              </div>
            )}
            {hasMacro && recetaMacroConSaldo && recetaMacroConSaldo.saldo_macro < 1 && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>No te quedan dispensaciones de macrodosis. El admin decidirá si aprueba.</span>
              </div>
            )}
            {hasMacro && recetaMacroConSaldo && recetaMacroGramsMax > 0 && cartMacroGrams > recetaMacroGramsMax && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Pides {cartMacroGrams}g macro pero tu receta autoriza {recetaMacroGramsMax}g. El admin decidirá si aprueba.</span>
              </div>
            )}
            {hasMicro && recetaMicroConSaldo && recetaMicroConSaldo.gramaje_micro && cartMicroGramajes.length > 0
              && !cartMicroGramajes.some(g => g?.replace(/\s/g, '').toLowerCase() === recetaMicroConSaldo.gramaje_micro?.replace(/\s/g, '').toLowerCase()) && (
              <div className={styles.warningBanner}>
                <Warning size={16} weight="fill" />
                <span>Tu receta indica {recetaMicroConSaldo.gramaje_micro} pero pediste {cartMicroGramajes.join(', ')}. El admin decidirá si aprueba.</span>
              </div>
            )}

            {/* ── Upload sections ── */}
            {hasMicro && (
              <>
                <h2 className={styles.sectionTitle}>Receta Microdosis</h2>
                <p className={styles.sectionSubtitle}>
                  {recetaMicro ? 'Opcional — ya tienes receta micro activa' : 'Sube la foto o PDF de tu receta'}
                </p>
                <input ref={microFileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => handleFileSelect(e, setRecipeMicro, setRecipeMicroName)} />
                <div
                  className={`${styles.uploadArea} ${recipeMicro ? styles.uploadAreaFilled : ''}`}
                  onClick={() => microFileRef.current?.click()}
                >
                  <UploadSimple size={32} weight="light" className={styles.uploadIcon} />
                  <p className={styles.uploadText}>{recipeMicro ? 'Cambiar archivo' : 'Toca para subir'}</p>
                  {recipeMicroName && <p className={styles.uploadFileName}>{recipeMicroName}</p>}
                </div>
              </>
            )}

            {hasMacro && (
              <>
                <h2 className={styles.sectionTitle}>Receta Macrodosis</h2>
                <p className={styles.sectionSubtitle}>
                  {recetaMacro ? 'Opcional — ya tienes receta macro activa' : 'Sube la foto o PDF de tu receta'}
                </p>
                <input ref={macroFileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => handleFileSelect(e, setRecipeMacro, setRecipeMacroName)} />
                <div
                  className={`${styles.uploadArea} ${recipeMacro ? styles.uploadAreaFilled : ''}`}
                  onClick={() => macroFileRef.current?.click()}
                >
                  <UploadSimple size={32} weight="light" className={styles.uploadIcon} />
                  <p className={styles.uploadText}>{recipeMacro ? 'Cambiar archivo' : 'Toca para subir'}</p>
                  {recipeMacroName && <p className={styles.uploadFileName}>{recipeMacroName}</p>}
                </div>
              </>
            )}

            <h2 className={styles.sectionTitle}>Contacto</h2>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Email</label>
              <input className={styles.formInput} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Teléfono (opcional)</label>
              <input className={styles.formInput} type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56 9 1234 5678" />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Notas (opcional)</label>
              <textarea className={styles.formTextarea} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Indicaciones especiales..." />
            </div>
          </>
        )}

        {/* ─── Step: Resumen ─── */}
        {step === 'resumen' && (
          <>
            <h2 className={styles.sectionTitle}>Resumen del pedido</h2>
            <div className={styles.cartSummary}>
              {cart.map(item => (
                <div key={item.id} className={styles.cartItem}>
                  <span className={styles.cartItemLabel}>{item.displayLabel}</span>
                  <span className={styles.cartItemPrice}>{formatCLP(item.lineTotal)}</span>
                  <button className={styles.cartItemRemove} onClick={() => removeFromCart(item.id)}>
                    <Trash size={16} weight="bold" />
                  </button>
                </div>
              ))}
              <div className={styles.cartTotal}>
                <span className={styles.cartTotalLabel}>Total</span>
                <span className={styles.cartTotalPrice}>{formatCLP(cartTotal)}</span>
              </div>
            </div>

            <p className={styles.sectionSubtitle}>
              Email: {email}
              {telefono && <><br />Teléfono: {telefono}</>}
              {notas && <><br />Notas: {notas}</>}
            </p>
          </>
        )}

        {/* ─── Cart preview (floating) ─── */}
        {cart.length > 0 && step !== 'resumen' && (
          <div className={styles.cartSummary} style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#4A3F35', margin: '0 0 8px' }}>
              <ShoppingCart size={14} weight="bold" /> Carrito ({cart.length})
            </p>
            {cart.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <span className={styles.cartItemLabel}>{item.displayLabel}</span>
                <span className={styles.cartItemPrice}>{formatCLP(item.lineTotal)}</span>
                <button className={styles.cartItemRemove} onClick={() => removeFromCart(item.id)}>
                  <Trash size={16} weight="bold" />
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
            Enviar Solicitud
          </button>
        ) : (
          <button className={styles.btnPrimary} onClick={goNext} disabled={step === 'recetas' && !canGoNext()}>
            {cart.length === 0 && (step === 'micro' || step === 'macro') ? 'Omitir' : 'Siguiente'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SolicitudForm;
