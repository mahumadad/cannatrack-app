import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from './Toast';
import { useUser } from '../hooks/useUser';
import { ArrowLeft, ClipboardText, Plus } from '@phosphor-icons/react';
import styles from './MisSolicitudes.module.css';
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
  new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

const MisSolicitudes: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast()!;
  const { user } = useUser();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadSolicitudes(user.id);
  }, [user]);

  const loadSolicitudes = async (userId: string) => {
    setLoading(true);
    try {
      const data = await api.get(`/api/solicitudes/${userId}`);
      setSolicitudes(data);
    } catch {
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const getItemsSummary = (sol: Solicitud): string => {
    const items = sol.cart_json || [];
    if (items.length === 0) return '';
    if (items.length === 1) return items[0].displayLabel;
    return `${items[0].displayLabel} +${items.length - 1} más`;
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate('/store')}>
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 className={styles.title}>Mis Solicitudes</h1>
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
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/store')}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 className={styles.title}>Mis Solicitudes</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className={styles.content}>
        {solicitudes.length === 0 ? (
          <div className={styles.emptyState}>
            <ClipboardText size={48} weight="light" />
            <p>No hay solicitudes aún</p>
            <p className={styles.emptySubtext}>Crea tu primer pedido con receta</p>
            <button className={styles.newSolicitudBtn} onClick={() => navigate('/store/solicitud')}>
              <Plus size={16} weight="bold" /> Nueva solicitud
            </button>
          </div>
        ) : (
          solicitudes.map(sol => {
            const status = STATUS_MAP[sol.estado] || { text: sol.estado, className: '' };
            return (
              <div key={sol.id} className={styles.solicitudCard} onClick={() => navigate(`/store/solicitudes/${sol.id}`)}>
                <div className={styles.solicitudHeader}>
                  <div>
                    <div className={styles.solicitudId}>{sol.submission_id}</div>
                    <div className={styles.solicitudDate}>{formatDate(sol.created_at)}</div>
                  </div>
                  <span className={`${styles.statusBadge} ${status.className}`}>{status.text}</span>
                </div>
                <div className={styles.solicitudItems}>{getItemsSummary(sol)}</div>
                <div className={styles.solicitudFooter}>
                  <span className={styles.solicitudTotal}>{formatCLP(sol.total_estimado)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MisSolicitudes;
