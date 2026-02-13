import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from './Toast';
import { useUser } from '../hooks/useUser';
import useSwipeBack from '../hooks/useSwipeBack';
import { ArrowLeft, ShoppingBag, User, CreditCard, XCircle } from '@phosphor-icons/react';
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
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (user?.id && id) loadSolicitud(user.id, id);
  }, [user, id]);

  const loadSolicitud = async (userId: string, solId: string) => {
    setLoading(true);
    try {
      const data = await api.get(`/api/solicitudes/${userId}/${solId}`);
      setSolicitud(data);
    } catch {
      toast.error('Error al cargar solicitud');
      navigate('/store/solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!user?.id || !id) return;
    setCancelling(true);
    try {
      await api.put(`/api/solicitudes/${user.id}/${id}/cancelar`, {
        razon: 'Cancelado por el usuario'
      });
      toast.success('Solicitud cancelada');
      // Reload to show updated state
      await loadSolicitud(user.id, id);
    } catch (error: any) {
      toast.error(error.message || 'Error al cancelar solicitud');
    } finally {
      setCancelling(false);
    }
  };

  const isCancellable = solicitud && ['pendiente', 'pre_aprobado', 'aprobado'].includes(solicitud.estado);

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
          <div className={`${styles.statusBadgeLarge} ${status.className}`}>{status.text}</div>
          <div className={styles.submissionId}>{solicitud.submission_id} · {formatDate(solicitud.created_at)}</div>
        </div>

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

        {/* Contact info */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <User size={18} weight="bold" /> Contacto
          </h3>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Email</span>
            <span className={styles.detailValue}>{solicitud.email}</span>
          </div>
          {solicitud.telefono && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Teléfono</span>
              <span className={styles.detailValue}>{solicitud.telefono}</span>
            </div>
          )}
          {solicitud.notas_cliente && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Notas</span>
              <span className={styles.detailValue}>{solicitud.notas_cliente}</span>
            </div>
          )}
        </div>

        {/* Observaciones (if rejected or cancelled) */}
        {solicitud.observaciones && (solicitud.estado === 'rechazado' || solicitud.estado === 'cancelado') && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{solicitud.estado === 'cancelado' ? 'Motivo de cancelación' : 'Observaciones'}</h3>
            <div className={styles.observaciones}>
              <p>{solicitud.cancelado_razon || solicitud.observaciones}</p>
            </div>
          </div>
        )}

        {/* Payment button (if approved) */}
        {solicitud.estado === 'aprobado' && solicitud.draft_order_url && (
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
