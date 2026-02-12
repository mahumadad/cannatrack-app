import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from './Toast';
import { useUser } from '../hooks/useUser';
import { ArrowLeft, Prescription, Calendar, UserCircle, Clock, FileText, CaretDown, CaretUp, Pill, Eye, X, Plus, Image as ImageIcon } from '@phosphor-icons/react';
import styles from './MisRecetas.module.css';
import type { Receta } from '../types';

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// --- Lightbox Component ---
const ImageLightbox: React.FC<{ src: string; alt: string; onClose: () => void }> = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className={styles.lightboxOverlay} onClick={onClose}>
      <button className={styles.lightboxClose} onClick={onClose}>
        <X size={22} weight="bold" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        className={styles.lightboxImage}
      />
    </div>
  );
};

const MisRecetas: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast()!;
  const { user } = useUser();
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState<'micro' | 'macro' | 'ambas'>('ambas');
  const [uploadFile, setUploadFile] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.id) loadRecetas(user.id);
  }, [user]);

  const loadRecetas = async (userId: string) => {
    setLoading(true);
    try {
      const data = await api.get(`/api/recetas/${userId}`);
      setRecetas(data);
    } catch {
      toast.error('Error al cargar recetas');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se acepta JPG, PNG, WebP o PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede exceder 10 MB');
      return;
    }

    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!uploadFile || !user?.id) return;
    setUploading(true);
    try {
      const result = await api.post(`/api/recetas/${user.id}/upload`, {
        recipeFile: uploadFile,
        type: uploadType
      });
      toast.success(result.action === 'updated' ? 'Receta actualizada' : 'Receta subida exitosamente');
      setShowUpload(false);
      setUploadFile(null);
      setUploadFileName('');
      loadRecetas(user.id);
    } catch (err: any) {
      toast.error(err.message || 'Error al subir receta');
    } finally {
      setUploading(false);
    }
  };

  const getSaldoPercentage = (saldo: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((saldo / total) * 100);
  };

  const getSaldoClass = (pct: number): string => {
    if (pct > 50) return styles.saldoHigh;
    if (pct > 20) return styles.saldoMedium;
    return styles.saldoLow;
  };

  const getEstadoClass = (estado: string): string => {
    const map: Record<string, string> = {
      activa: styles.estadoActiva,
      vencida: styles.estadoVencida,
      completada: styles.estadoCompletada,
      cancelada: styles.estadoVencida
    };
    return map[estado] || '';
  };

  const getEstadoLabel = (estado: string): string => {
    const map: Record<string, string> = {
      activa: 'Activa',
      vencida: 'Vencida',
      completada: 'Completada',
      cancelada: 'Cancelada'
    };
    return map[estado] || estado;
  };

  const getConfianzaLabel = (confianza: string | null) => {
    if (!confianza) return null;
    const map: Record<string, { text: string; cls: string }> = {
      alta: { text: 'Confianza alta', cls: styles.confianzaAlta },
      media: { text: 'Confianza media', cls: styles.confianzaMedia },
      baja: { text: 'Confianza baja', cls: styles.confianzaBaja }
    };
    return map[confianza] || null;
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate('/store')}>
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 className={styles.title}>Mis Recetas</h1>
          <div style={{ width: 36 }} />
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {lightboxUrl && <ImageLightbox src={lightboxUrl} alt="Receta" onClose={() => setLightboxUrl(null)} />}

      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/store')}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 className={styles.title}>Mis Recetas</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Banner para subir receta */}
      <div className={styles.newRecetaBanner} onClick={() => setShowUpload(!showUpload)}>
        <div className={styles.newRecetaBannerContent}>
          <Plus size={20} weight="bold" />
          <div>
            <p className={styles.newRecetaBannerTitle}>Subir o actualizar receta</p>
            <p className={styles.newRecetaBannerSubtitle}>Sube tu receta medica sin necesidad de hacer un pedido</p>
          </div>
        </div>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className={styles.uploadForm}>
          <p className={styles.uploadTypeLabel}>Tipo de receta:</p>
          <div className={styles.uploadTypeRow}>
            <button
              className={`${styles.uploadTypeBtn} ${uploadType === 'ambas' ? styles.uploadTypeBtnActive : ''}`}
              onClick={() => setUploadType('ambas')}
            >
              Micro + Macro
            </button>
            <button
              className={`${styles.uploadTypeBtn} ${uploadType === 'micro' ? styles.uploadTypeBtnActive : ''}`}
              onClick={() => setUploadType('micro')}
            >
              Solo Micro
            </button>
            <button
              className={`${styles.uploadTypeBtn} ${uploadType === 'macro' ? styles.uploadTypeBtnActive : ''}`}
              onClick={() => setUploadType('macro')}
            >
              Solo Macro
            </button>
          </div>

          <label className={styles.uploadFileLabel}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className={styles.uploadFileInput}
            />
            <FileText size={20} weight="bold" />
            <span>{uploadFileName || 'Seleccionar archivo (JPG, PNG, PDF)'}</span>
          </label>

          {uploadFile && (
            <button
              className={styles.uploadSubmitBtn}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Subiendo...' : 'Subir receta'}
            </button>
          )}
        </div>
      )}

      <div className={styles.content}>
        {recetas.length === 0 ? (
          <div className={styles.emptyState}>
            <Prescription size={48} weight="light" />
            <p>No hay recetas registradas</p>
            <p className={styles.emptySubtext}>Tus recetas apareceran aqui despues de tu primera solicitud</p>
          </div>
        ) : (
          recetas.map(receta => {
            const microPct = getSaldoPercentage(receta.saldo_micro, receta.total_micro_autorizado);
            const macroPct = getSaldoPercentage(receta.saldo_macro, receta.total_macro_autorizado);
            const isExpanded = expandedId === receta.id;
            const confianza = getConfianzaLabel(receta.ai_confianza);
            const hasImages = receta.archivo_micro_url || receta.archivo_macro_url;

            return (
              <div key={receta.id} className={styles.recetaCard}>
                {/* Header con estado */}
                <div className={styles.recetaHeader} onClick={() => toggleExpand(receta.id)}>
                  <div>
                    <div className={styles.recetaDoctor}>
                      {receta.medico_nombre || 'Medico no registrado'}
                    </div>
                    <div className={styles.recetaDate}>
                      <Calendar size={12} weight="bold" /> Emitida: {formatDate(receta.fecha_emision)}
                    </div>
                  </div>
                  <div className={styles.headerRight}>
                    <span className={`${styles.estadoBadge} ${getEstadoClass(receta.estado)}`}>
                      {getEstadoLabel(receta.estado)}
                    </span>
                    {isExpanded ? <CaretUp size={16} weight="bold" style={{ color: '#999' }} /> : <CaretDown size={16} weight="bold" style={{ color: '#999' }} />}
                  </div>
                </div>

                {/* Barras de saldo (siempre visibles) */}
                <div className={styles.saldoSection}>
                  {receta.total_micro_autorizado > 0 && (
                    <div className={styles.saldoRow}>
                      <div className={styles.saldoLabel}>
                        <span className={styles.saldoName}>
                          <Pill size={13} weight="bold" /> Microdosis {receta.gramaje_micro && `(${receta.gramaje_micro})`}
                        </span>
                        <span className={styles.saldoCount}>{receta.saldo_micro} / {receta.total_micro_autorizado} caps</span>
                      </div>
                      <div className={styles.saldoBar}>
                        <div className={`${styles.saldoFill} ${getSaldoClass(microPct)}`} style={{ width: `${microPct}%` }} />
                      </div>
                    </div>
                  )}

                  {receta.total_macro_autorizado > 0 && (
                    <div className={styles.saldoRow}>
                      <div className={styles.saldoLabel}>
                        <span className={styles.saldoName}>Macrodosis {receta.gramaje_macro && `(${receta.gramaje_macro})`}</span>
                        <span className={styles.saldoCount}>{receta.saldo_macro} / {receta.total_macro_autorizado}</span>
                      </div>
                      <div className={styles.saldoBar}>
                        <div className={`${styles.saldoFill} ${getSaldoClass(macroPct)}`} style={{ width: `${macroPct}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Detalles expandibles */}
                {isExpanded && (
                  <div className={styles.detailsSection}>
                    {/* Imagenes de la receta */}
                    {hasImages && (
                      <div className={styles.detailGroup}>
                        <h4 className={styles.detailGroupTitle}>
                          <ImageIcon size={16} weight="bold" /> Documento de Receta
                        </h4>
                        <div className={styles.recetaImages}>
                          {receta.archivo_micro_url && (
                            <div className={styles.recetaImageWrapper}>
                              <img
                                src={receta.archivo_micro_url}
                                alt="Receta Micro"
                                className={styles.recetaThumbnail}
                                onClick={(e) => { e.stopPropagation(); setLightboxUrl(receta.archivo_micro_url!); }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                              <button
                                className={styles.recetaImageBtn}
                                onClick={(e) => { e.stopPropagation(); setLightboxUrl(receta.archivo_micro_url!); }}
                              >
                                <Eye size={14} weight="bold" /> Ver micro
                              </button>
                            </div>
                          )}
                          {receta.archivo_macro_url && (
                            <div className={styles.recetaImageWrapper}>
                              <img
                                src={receta.archivo_macro_url}
                                alt="Receta Macro"
                                className={styles.recetaThumbnail}
                                onClick={(e) => { e.stopPropagation(); setLightboxUrl(receta.archivo_macro_url!); }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                              <button
                                className={styles.recetaImageBtn}
                                onClick={(e) => { e.stopPropagation(); setLightboxUrl(receta.archivo_macro_url!); }}
                              >
                                <Eye size={14} weight="bold" /> Ver macro
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Datos del paciente */}
                    <div className={styles.detailGroup}>
                      <h4 className={styles.detailGroupTitle}>
                        <UserCircle size={16} weight="bold" /> Paciente
                      </h4>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Nombre</span>
                        <span className={styles.detailValue}>{receta.paciente_nombre || '-'}</span>
                      </div>
                      {receta.paciente_rut && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>RUT</span>
                          <span className={styles.detailValue}>{receta.paciente_rut}</span>
                        </div>
                      )}
                    </div>

                    {/* Datos de la receta */}
                    <div className={styles.detailGroup}>
                      <h4 className={styles.detailGroupTitle}>
                        <FileText size={16} weight="bold" /> Datos de la Receta
                      </h4>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Fecha emision</span>
                        <span className={styles.detailValue}>{formatDate(receta.fecha_emision)}</span>
                      </div>
                      {receta.fecha_vencimiento && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Vencimiento</span>
                          <span className={styles.detailValue}>{formatDate(receta.fecha_vencimiento)}</span>
                        </div>
                      )}
                      {receta.protocolo && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Protocolo</span>
                          <span className={styles.detailValue}>{receta.protocolo}</span>
                        </div>
                      )}
                      {receta.duracion && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Duracion</span>
                          <span className={styles.detailValue}>{receta.duracion}</span>
                        </div>
                      )}
                      {receta.notas && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Notas</span>
                          <span className={styles.detailValue}>{receta.notas}</span>
                        </div>
                      )}
                    </div>

                    {/* Cantidades autorizadas */}
                    <div className={styles.detailGroup}>
                      <h4 className={styles.detailGroupTitle}>
                        <Prescription size={16} weight="bold" /> Autorizacion
                      </h4>
                      {receta.total_micro_autorizado > 0 && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Micro autorizado</span>
                          <span className={styles.detailValue}>{receta.total_micro_autorizado} caps{receta.gramaje_micro ? ` de ${receta.gramaje_micro}` : ''}</span>
                        </div>
                      )}
                      {receta.total_macro_autorizado > 0 && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Macro autorizado</span>
                          <span className={styles.detailValue}>{receta.total_macro_autorizado} uds{receta.gramaje_macro ? ` de ${receta.gramaje_macro}` : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Metadatos */}
                    <div className={styles.metaFooter}>
                      {confianza && (
                        <span className={`${styles.confianzaBadge} ${confianza.cls}`}>{confianza.text}</span>
                      )}
                      <span className={styles.metaTimestamp}>
                        <Clock size={12} weight="bold" /> Subida: {formatDateTime(receta.created_at)}
                      </span>
                      {receta.updated_at && receta.updated_at !== receta.created_at && (
                        <span className={styles.metaTimestamp}>
                          Actualizada: {formatDateTime(receta.updated_at)}
                        </span>
                      )}
                    </div>

                    {/* Boton para pedir con esta receta */}
                    {receta.estado === 'activa' && (receta.saldo_micro > 0 || receta.saldo_macro > 0) && (
                      <button
                        className={styles.orderWithRecetaBtn}
                        onClick={(e) => { e.stopPropagation(); navigate('/store/solicitud'); }}
                      >
                        <Prescription size={16} weight="bold" /> Hacer pedido con esta receta
                      </button>
                    )}
                  </div>
                )}

                {/* Chips de resumen (visible cuando colapsado) */}
                {!isExpanded && (
                  <div className={styles.recetaMeta}>
                    {receta.paciente_nombre && (
                      <span className={styles.metaChip}>
                        <UserCircle size={14} weight="bold" /> {receta.paciente_nombre}
                      </span>
                    )}
                    {receta.protocolo && (
                      <span className={styles.metaChip}>{receta.protocolo}</span>
                    )}
                    {receta.fecha_vencimiento && (
                      <span className={styles.metaChip}>
                        <Calendar size={14} weight="bold" /> Vence: {formatDate(receta.fecha_vencimiento)}
                      </span>
                    )}
                    {hasImages && (
                      <span className={styles.metaChip}>
                        <ImageIcon size={14} weight="bold" /> Receta adjunta
                      </span>
                    )}
                    <span className={styles.metaChip}>
                      <Clock size={14} weight="bold" /> {formatDate(receta.created_at)}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MisRecetas;
