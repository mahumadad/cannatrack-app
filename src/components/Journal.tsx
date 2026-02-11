import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { toLocalDateString } from '../utils/dateHelpers';
import { useToast } from './Toast';
import { Plus, Trash, ArrowLeft, ArrowRight, Notebook } from '@phosphor-icons/react';
import BottomNav from './BottomNav';
import styles from './Journal.module.css';
import { useUser } from '../hooks/useUser';
import type { JournalEntry, JournalPagination } from '../types';

interface JournalFormData {
  title: string;
  content: string;
  date: string;
}

const Journal: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  const { user } = useUser();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [pagination, setPagination] = useState<JournalPagination>({ page: 1, totalPages: 1, hasMore: false, total: 0, limit: 20 });
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(dateParam || toLocalDateString());
  const [journalForm, setJournalForm] = useState<JournalFormData>({
    title: '',
    content: '',
    date: toLocalDateString()
  });

  useEffect(() => {
    if (user?.id) {
      loadJournalEntries(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (dateParam) {
      setSelectedDate(dateParam);
      setViewMode('day');
    }
  }, [dateParam]);

  const loadJournalEntries = async (userId: string, page: number = 1, append: boolean = false) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const data = await api.get(`/api/journal/${userId}?page=${page}&limit=20`);
      const entries = data.items || data;
      if (append) {
        setJournalEntries(prev => [...prev, ...entries]);
      } else {
        setJournalEntries(entries);
      }
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      toast!.error('Error al cargar bitácora');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreEntries = () => {
    if (pagination.hasMore && user?.id) {
      loadJournalEntries(user.id, pagination.page + 1, true);
    }
  };

  const handleSaveJournal = async () => {
    if (!journalForm.content.trim()) {
      toast!.warning('Escribe algo en tu entrada');
      return;
    }
    setSaving(true);
    try {
      const body = {
        user_id: user!.id,
        date: journalForm.date,
        title: journalForm.title || null,
        content: journalForm.content
      };
      if (editingEntry) {
        await api.put(`/api/journal/${editingEntry.id}`, body);
      } else {
        await api.post('/api/journal', body);
      }
      toast!.success(editingEntry ? 'Entrada actualizada 📝' : 'Entrada guardada 📝');
      loadJournalEntries(user!.id);
      closeEditor();
    } catch (error) {
      toast!.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJournal = async (id: string) => {
    if (!confirm('¿Eliminar esta entrada?')) return;
    try {
      await api.delete(`/api/journal/${id}`);
      toast!.info('Entrada eliminada');
      loadJournalEntries(user!.id);
    } catch (error) {
      toast!.error('Error al eliminar');
    }
  };

  const openEditor = (entry: JournalEntry | null = null) => {
    setEditingEntry(entry);
    setJournalForm(entry 
      ? { title: entry.title || '', content: entry.content, date: entry.date }
      : { title: '', content: '', date: selectedDate }
    );
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingEntry(null);
    setJournalForm({ title: '', content: '', date: toLocalDateString() });
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const formatShortDate = (dateStr: string): string => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getFilteredEntries = (): JournalEntry[] => {
    if (viewMode === 'all') return journalEntries;
    
    const selected = new Date(selectedDate + 'T12:00:00');
    
    return journalEntries.filter(entry => {
      const entryDate = new Date(entry.date + 'T12:00:00');
      
      if (viewMode === 'day') {
        return entry.date === selectedDate;
      }
      
      if (viewMode === 'week') {
        const startOfWeek = new Date(selected);
        startOfWeek.setDate(selected.getDate() - selected.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return entryDate >= startOfWeek && entryDate <= endOfWeek;
      }
      
      if (viewMode === 'month') {
        return entryDate.getMonth() === selected.getMonth() && 
               entryDate.getFullYear() === selected.getFullYear();
      }
      
      return true;
    });
  };

  const filteredEntries = getFilteredEntries();

  const getViewTitle = (): string => {
    if (viewMode === 'all') return 'Todas las entradas';
    if (viewMode === 'day') return formatDate(selectedDate);
    if (viewMode === 'week') {
      const selected = new Date(selectedDate + 'T12:00:00');
      const startOfWeek = new Date(selected);
      startOfWeek.setDate(selected.getDate() - selected.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `Semana del ${startOfWeek.getDate()} al ${endOfWeek.getDate()}`;
    }
    if (viewMode === 'month') {
      const selected = new Date(selectedDate + 'T12:00:00');
      return selected.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }
    return 'Bitácora';
  };

  const renderViewToggle = () => (
    <div className={styles.viewToggle}>
      <button className={`${styles.viewButton} ${viewMode === 'all' ? styles.active : ''}`} onClick={() => setViewMode('all')}>Todas</button>
      <button className={`${styles.viewButton} ${viewMode === 'day' ? styles.active : ''}`} onClick={() => setViewMode('day')}>Día</button>
      <button className={`${styles.viewButton} ${viewMode === 'week' ? styles.active : ''}`} onClick={() => setViewMode('week')}>Semana</button>
      <button className={`${styles.viewButton} ${viewMode === 'month' ? styles.active : ''}`} onClick={() => setViewMode('month')}>Mes</button>
    </div>
  );

  const renderDateSelector = () => {
    if (viewMode === 'all') return null;
    
    return (
      <div className={styles.dateSelector}>
        <button className={styles.dateNavButton} onClick={() => {
          const date = new Date(selectedDate + 'T12:00:00');
          if (viewMode === 'day') date.setDate(date.getDate() - 1);
          if (viewMode === 'week') date.setDate(date.getDate() - 7);
          if (viewMode === 'month') date.setMonth(date.getMonth() - 1);
          setSelectedDate(toLocalDateString(date));
        }}><ArrowLeft size={20} weight="bold" /></button>
        <span className={styles.dateDisplay}>{getViewTitle()}</span>
        <button className={styles.dateNavButton} onClick={() => {
          const date = new Date(selectedDate + 'T12:00:00');
          if (viewMode === 'day') date.setDate(date.getDate() + 1);
          if (viewMode === 'week') date.setDate(date.getDate() + 7);
          if (viewMode === 'month') date.setMonth(date.getMonth() + 1);
          setSelectedDate(toLocalDateString(date));
        }}><ArrowRight size={20} weight="bold" /></button>
      </div>
    );
  };

  const renderJournalList = () => (
    <div className={styles.journalContainer}>
      {renderViewToggle()}
      {renderDateSelector()}
      <h2 className={styles.journalTitle}>{viewMode === 'all' ? `${pagination.total || journalEntries.length} entradas` : `${filteredEntries.length} entradas`}</h2>
      {filteredEntries.length === 0 ? (
        <div className={styles.emptyJournal}>
          <Notebook size={48} weight="light" className={styles.emptyIcon} />
          <p>No hay entradas {viewMode !== 'all' ? 'en este período' : 'aún'}</p>
          <p className={styles.emptySubtext}>Presiona + para escribir</p>
        </div>
      ) : (
        <div className={styles.journalList}>
          {filteredEntries.map(entry => (
            <div key={entry.id} className={styles.journalEntry} onClick={() => openEditor(entry)}>
              <div className={styles.entryHeader}>
                <span className={styles.entryTitle}>{entry.title || 'Sin título'}</span>
                <span className={styles.entryDate}>{formatShortDate(entry.date)}</span>
              </div>
              <p className={styles.entryPreview}>{entry.content.substring(0, 120)}{entry.content.length > 120 ? '...' : ''}</p>
              <button className={styles.deleteEntry} onClick={(e) => { e.stopPropagation(); handleDeleteJournal(entry.id); }}><Trash size={18} weight="regular" /></button>
            </div>
          ))}
          {viewMode === 'all' && pagination.hasMore && (
            <button className={styles.loadMoreButton} onClick={loadMoreEntries} disabled={loadingMore}>
              {loadingMore ? 'Cargando...' : `Cargar más (${journalEntries.length} de ${pagination.total})`}
            </button>
          )}
        </div>
      )}
      <button className={styles.fab} onClick={() => openEditor()}><Plus size={24} weight="bold" /></button>
    </div>
  );

  const renderEditor = () => (
    <div className={styles.editorContainer}>
      <div className={styles.editorHeader}>
        <div className={styles.editorField}>
          <label>Fecha</label>
          <input type="date" value={journalForm.date} onChange={(e) => setJournalForm(p => ({ ...p, date: e.target.value }))} className={styles.dateInput} />
        </div>
        <div className={styles.editorField}>
          <label>Título (opcional)</label>
          <input type="text" value={journalForm.title} onChange={(e) => setJournalForm(p => ({ ...p, title: e.target.value }))} placeholder="Dale un título..." className={styles.titleInput} />
        </div>
      </div>
      <textarea className={styles.journalTextarea} value={journalForm.content} onChange={(e) => setJournalForm(p => ({ ...p, content: e.target.value }))} placeholder="Escribe tus pensamientos, reflexiones, sueños..." autoFocus />
      <div className={styles.editorFooter}>
        <button className={styles.cancelButton} onClick={closeEditor}>Cancelar</button>
        <button className={styles.saveButton} onClick={handleSaveJournal} disabled={saving}>{saving ? 'Guardando...' : editingEntry ? 'Actualizar' : 'Guardar'}</button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.journal}>
        <div className={styles.header}><div style={{ width: 60 }}></div><h1 className={styles.title}>Bitácora</h1><div style={{ width: 60 }}></div></div>
        <div className={styles.loadingContainer}><div className={styles.loadingSpinner}></div><p>Cargando...</p></div>
      </div>
    );
  }

  return (
    <div className={styles.journal}>
      <div className={styles.header}><div style={{ width: 60 }}></div><h1 className={styles.title}>{showEditor ? (editingEntry ? 'Editar Entrada' : 'Nueva Entrada') : 'Bitácora'}</h1><div style={{ width: 60 }}></div></div>
      {showEditor ? renderEditor() : renderJournalList()}
      <BottomNav activePage="journal" />
    </div>
  );
};

export default Journal;
