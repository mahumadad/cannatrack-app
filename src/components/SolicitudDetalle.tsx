import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from './Toast';
import { useUser } from '../hooks/useUser';
import { useSolicitudDetail, useCancelSolicitud } from '../hooks/queries';
import useSwipeBack from '../hooks/useSwipeBack';
import { ArrowLeft, ShoppingBag, User, CreditCard, XCircle, Prescription, Stethoscope, Calendar } from '@phosphor-icons/react';
import styles from './SolicitudDetalle.module.css';
import type { Solicitud, SolicitudEstado } from '../types';

const STATUS_MAP: Record<SolicitudEstado, { text: string; className: string }> = {
  pendiente: { text: 'Pendiente', className: styles.statusPendiente },
  pre_aprobado: { text: 'Pre-aprobado', className: styles.statusPreAprobado },
  aprobado: { text: 'Aprobado', className: styles.statusAprobado },
  rechazado: { text: 'Rechazado', className: styles.statusRechazado },
  cancelado: { text: 'Cancelado', className: styles.statusCancelado },
  pagado: { text: 'Pagado', className: styles.statusPagado },
  despachado: { text: 'Despachado', className: styles.statusDespachado },
  entregado: { text: 'Entregado', className: styles.statusEntregado }
};

const formatCLP = (n: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const SolicitudDetalle: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const toast = useToast()!;
  const { user } = useUser();
  useSwipeBack();
  const { data: solicitud, isLoading: loading } = useSolicitudDetail(user?.id, id);
  const cancelMutation = useCancelSolicitud(user?.id);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      await cancelMutation.mutateAsync(id);
      toast.success('Solicitud cancelada');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cancelar solicitud';
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  const isCancellable = solicitud && solicitud.estado === 'pendiente';

  if (loading || !solicitud) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 className={styles.title}>Detalle</h1>
          <div style={{ width: 36 }} />
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
        </div>
      </div>
    );
  }

  const status = STATUS_MAP[solicitud.estado] || { text: solicitud.estado, className: '' };
  const items = solicitud.cart_json || [];
  const isReceta = solicitud.tipo === 'receta';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 className={styles.title}>Detalle</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className={styles.content}>
        {/* Status header */}
        <div className={styles.statusHeader}>
          <div className={styles.tipoBadgeRow}>
            <span className={isReceta ? styles.tipoBadgeReceta : styles.tipoBadgeDispensacion}>
              {isReceta ? 'Receta' : 'Dispensación'}
            </span>
            <div className={`${styles.statusBadgeLarge} ${status.className}`}>{status.text}</div>
          </div>
          <div className={styles.submissionId}>{solicitud.submission_id} · {formatDate(solicitud.created_at)}</div>
        </div>

        {isReceta ? (
          /* ── Receta solicitud view ── */
          <>
            {/* Receta info */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>
                <Prescription size={18} weight="bold" /> Datos de la receta
              </h3>
              {solicitud.ai_medico_nombre && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Médico</span>
                  <span className={styles.detailValue}>{solicitud.ai_medico_nombre}</span>
                </div>
              )}
              {solicitud.ai_paciente_nombre && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Paciente</span>
                  <span className={styles.detailValue}>{solicitud.ai_paciente_nombre}</span>
                </div>
              )}
              {solicitud.ai_fecha_emision && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Fecha emisión</span>
                  <span className={styles.detailValue}>{solicitud.ai_fecha_emision}</span>
                </div>
              )}
              {(solicitud.ai_total_micro != null && solicitud.ai_total_micro > 0) && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Micro autorizado</span>
                  <span className={styles.detailValue}>{solicitud.ai_total_micro} dosis {solicitud.ai_gramaje_micro && `(${solicitud.ai_gramaje_micro})`}</span>
                </div>
              )}
              {(solicitud.ai_total_macro != null && solicitud.ai_total_macro > 0) && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Macro autorizado</span>
                  <span className={styles.detailValue}>{solicitud.ai_total_macro} dosis</span>
                </div>
              )}
              {solicitud.ai_protocolo && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Protocolo</span>
                  <span className={styles.detailValue}>{solicitud.ai_protocolo}</span>
                </div>
              )}
              {solicitud.ai_duracion && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Duración</span>
                  <span className={styles.detailValue}>{solicitud.ai_duracion}</span>
                </div>
              )}
              {/* Fallback if no AI data was extracted */}
              {!solicitud.ai_medico_nombre && !solicitud.ai_paciente_nombre && !solicitud.ai_fecha_emision && (
                <p className={styles.recetaNoData}>Receta en proceso de revisión</p>
              )}
            </div>
          </>
        ) : (
          /* ── Dispensación solicitud view ── */
          <>
            {/* Cart items */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>
                <ShoppingBag size={18} weight="bold" /> Productos
              </h3>
              {items.map((item, i) => (
                <div key={i} className={styles.cartItem}>
                  <span className={styles.cartItemLabel}>{item.displayLabel}</span>
                  <span className={styles.cartItemPrice}>{formatCLP(item.lineTotal)}</span>
                </div>
              ))}
              <div className={styles.cartTotal}>
                <span className={styles.cartTotalLabel}>Total</span>
                <span className={styles.cartTotalPrice}>{formatCLP(solicitud.total_estimado)}</span>
              </div>
            </div>
          </>
        )}

        {/* Notas del cliente */}
        {solicitud.notas_cliente && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <User size={18} weight="bold" /> Notas
            </h3>
            <div className={styles.detailRow}>
              <span className={styles.detailValue}>{solicitud.notas_cliente}</span>
            </div>
          </div>
        )}

        {/* Observaciones (if rejected or cancelled) */}
        {solicitud.observaciones && (solicitud.estado === 'rechazado' || solicitud.estado === 'cancelado') && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{solicitud.estado === 'cancelado' ? 'Motivo de cancelación' : 'Observaciones'}</h3>
            <div className={styles.observaciones}>
              <p>{solicitud.cancelado_razon || solicitud.observaciones}</p>
            </div>
          </div>
        )}

        {/* Payment button (if approved dispensación) */}
        {!isReceta && solicitud.estado === 'aprobado' && solicitud.draft_order_url && (
          <a href={solicitud.draft_order_url} target="_blank" rel="noopener noreferrer" className={styles.paymentBtn}>
            <CreditCard size={18} weight="bold" /> Ir al pago
          </a>
        )}

        {/* Cancel button (if cancellable) */}
        {isCancellable && (
          <button className={styles.cancelBtn} onClick={handleCancel} disabled={cancelling}>
            <XCircle size={18} weight="bold" /> {cancelling ? 'Cancelando...' : 'Cancelar solicitud'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SolicitudDetalle;
