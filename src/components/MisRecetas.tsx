import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from './Toast';
import { useUser } from '../hooks/useUser';
import { ArrowLeft, Prescription, Calendar, UserCircle } from '@phosphor-icons/react';
import styles from './MisRecetas.module.css';
import type { Receta } from '../types';

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

const MisRecetas: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast()!;
  const { user } = useUser();
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/store')}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 className={styles.title}>Mis Recetas</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className={styles.content}>
        {recetas.length === 0 ? (
          <div className={styles.emptyState}>
            <Prescription size={48} weight="light" />
            <p>No hay recetas registradas</p>
            <p className={styles.emptySubtext}>Tus recetas aparecerán aquí después de tu primera solicitud</p>
          </div>
        ) : (
          recetas.map(receta => {
            const microPct = getSaldoPercentage(receta.saldo_micro, receta.total_micro_autorizado);
            const macroPct = getSaldoPercentage(receta.saldo_macro, receta.total_macro_autorizado);

            return (
              <div key={receta.id} className={styles.recetaCard}>
                <div className={styles.recetaHeader}>
                  <div>
                    <div className={styles.recetaDoctor}>{receta.medico_nombre || 'Médico no registrado'}</div>
                    <div className={styles.recetaDate}>{formatDate(receta.fecha_emision)}</div>
                  </div>
                  <span className={`${styles.estadoBadge} ${getEstadoClass(receta.estado)}`}>
                    {getEstadoLabel(receta.estado)}
                  </span>
                </div>

                <div className={styles.saldoSection}>
                  {receta.total_micro_autorizado > 0 && (
                    <div className={styles.saldoRow}>
                      <div className={styles.saldoLabel}>
                        <span className={styles.saldoName}>Microdosis {receta.gramaje_micro && `(${receta.gramaje_micro})`}</span>
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
                        <span className={styles.saldoName}>Macrodosis</span>
                        <span className={styles.saldoCount}>{receta.saldo_macro} / {receta.total_macro_autorizado}</span>
                      </div>
                      <div className={styles.saldoBar}>
                        <div className={`${styles.saldoFill} ${getSaldoClass(macroPct)}`} style={{ width: `${macroPct}%` }} />
                      </div>
                    </div>
                  )}
                </div>

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
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MisRecetas;
