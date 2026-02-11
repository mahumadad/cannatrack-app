import React, { useState, useEffect, useRef } from 'react';
import { Pill, BookOpen, Calendar, CaretLeft, CaretRight } from '@phosphor-icons/react';
import api from '../utils/api';
import { toLocalDateString } from '../utils/dateHelpers';
import styles from './WeeklyCalendar.module.css';
import type { Protocol, DoseLog, Checkin, CalendarDay } from '../types';

interface WeeklyCalendarProps {
  userId: string | undefined;
  onDayClick?: (day: CalendarDay) => void;
  refreshKey: number;
  followUpDates?: string[];
  followUpCompletedDates?: string[];
  protocol: Protocol | null;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ userId, onDayClick, refreshKey, followUpDates = [], followUpCompletedDates = [], protocol }) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [doses, setDoses] = useState<DoseLog[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [protocolDays, setProtocolDays] = useState<Set<string>>(new Set());
  const [isSliding, setIsSliding] = useState<boolean>(false);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const isIntuitive = protocol?.frequency === 'intuitive';

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, refreshKey, viewMode, currentMonth]);

  useEffect(() => {
    if (isIntuitive) {
      setProtocolDays(new Set());
      return;
    }
    if (protocol) {
      calculateProtocolDays();
    }
  }, [protocol, doses, currentMonth, viewMode, isIntuitive]);

  useEffect(() => {
    generateDays();
  }, [viewMode, currentMonth, protocolDays, followUpDates, followUpCompletedDates, weekOffset]);

  const loadData = async () => {
    setLoading(true);

    try {
      const dosesData = await api.get(`/api/doses/${userId}?days=60`);
      setDoses(dosesData);
    } catch (error) {
      console.error('Error loading doses:', error);
    }

    try {
      const checkinsData = await api.get(`/api/checkins/${userId}?days=60`);
      setCheckins(checkinsData);
    } catch (error) {
      console.error('Error loading checkins:', error);
    }

    setLoading(false);
  };

  const generateDays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const generatedDays = [];

    if (viewMode === 'week') {
      const baseDate = new Date(today);
      baseDate.setDate(today.getDate() + (weekOffset * 7));
      
      for (let i = -3; i <= 3; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + i);
        generatedDays.push(createDayObject(date, today));
      }
    } else {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      let startPadding = firstDay.getDay();
      for (let i = startPadding - 1; i >= 0; i--) {
        const date = new Date(year, month, -i);
        generatedDays.push({ ...createDayObject(date, today), isOtherMonth: true });
      }
      
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        generatedDays.push(createDayObject(date, today));
      }
      
      const endPadding = 42 - generatedDays.length;
      for (let i = 1; i <= endPadding; i++) {
        const date = new Date(year, month + 1, i);
        generatedDays.push({ ...createDayObject(date, today), isOtherMonth: true });
      }
    }

    setDays(generatedDays);
  };

  const createDayObject = (date: Date, today: Date): CalendarDay => {
    const dateString = toLocalDateString(date);
    const isFuture = date > today;
    const isFollowUpDay = followUpDates.includes(dateString) || followUpCompletedDates.includes(dateString);
    const isFollowUpCompleted = followUpCompletedDates.includes(dateString);

    return {
      date: new Date(date),
      dateString: dateString,
      day: date.getDate(),
      weekday: date.toLocaleDateString('es-ES', { weekday: 'short' }),
      isToday: date.getTime() === today.getTime(),
      isFuture: isFuture,
      isClickable: !isFuture || !!isFollowUpDay,
      isFollowUpDay: !!isFollowUpDay,
      isFollowUpCompleted,
      isOtherMonth: false
    };
  };

  const calculateProtocolDays = () => {
    if (isIntuitive || !protocol) {
      setProtocolDays(new Set());
      return;
    }

    // Priorizar start_date del protocolo para calcular el ciclo
    let startDateObj: Date;
    if (protocol.start_date) {
      const parts = protocol.start_date.split('-');
      startDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else if (doses.length > 0) {
      const sortedDoses = [...doses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      startDateObj = new Date(sortedDoses[0].date);
    } else {
      startDateObj = new Date();
    }
    startDateObj.setHours(0, 0, 0, 0);

    const scheduledDays = new Set<string>();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 60);

    let currentDate = new Date(startDateObj);

    switch (protocol.frequency) {
      case 'fadiman':
        while (currentDate <= endDate) {
          scheduledDays.add(toLocalDateString(currentDate));
          currentDate.setDate(currentDate.getDate() + 3);
        }
        break;

      case 'stamets':
        // Stamets: 4 dias ON, 3 dias OFF
        while (currentDate <= endDate) {
          for (let i = 0; i < 4 && currentDate <= endDate; i++) {
            scheduledDays.add(toLocalDateString(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
          currentDate.setDate(currentDate.getDate() + 3); // 3 dias OFF
        }
        break;

      case 'every_x_days':
        const interval = (protocol.frequency_value as any)?.days || 3;
        while (currentDate <= endDate) {
          scheduledDays.add(toLocalDateString(currentDate));
          currentDate.setDate(currentDate.getDate() + interval);
        }
        break;

      case 'specific_days':
        const selectedDays = (protocol.frequency_value || {}) as Record<string, boolean>;
        const dayMap: Record<string, number> = {
          domingo: 0, lunes: 1, martes: 2, miercoles: 3,
          jueves: 4, viernes: 5, sabado: 6
        };
        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay();
          const dayName = Object.keys(dayMap).find(k => dayMap[k] === dayOfWeek);
          if (dayName && selectedDays[dayName]) {
            scheduledDays.add(toLocalDateString(currentDate));
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        break;

      case 'custom':
        const onDays = (protocol.frequency_value as any)?.on || 1;
        const offDays = (protocol.frequency_value as any)?.off || 2;
        while (currentDate <= endDate) {
          for (let i = 0; i < onDays && currentDate <= endDate; i++) {
            scheduledDays.add(toLocalDateString(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
          currentDate.setDate(currentDate.getDate() + offDays);
        }
        break;

      case 'intuitive':
        break;

      default:
        while (currentDate <= endDate) {
          scheduledDays.add(toLocalDateString(currentDate));
          currentDate.setDate(currentDate.getDate() + 3);
        }
    }

    setProtocolDays(scheduledDays);
  };

  const getDayDoses = (dateString: string): DoseLog[] => {
    return doses.filter(dose => toLocalDateString(new Date(dose.date)) === dateString);
  };

  const getDayCheckin = (dateString: string): Checkin | undefined => {
    return checkins.find(checkin => checkin.date === dateString);
  };

  const getDoseStatus = (day: CalendarDay): string | null => {
    const hasDose = getDayDoses(day.dateString).length > 0;
    const isScheduled = protocolDays.has(day.dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);
    const isPast = dayDate < today;

    if (isIntuitive) {
      if (hasDose) return 'taken';
      return null;
    }

    if (hasDose) return 'taken';
    if (isPast && isScheduled && !hasDose) return 'missed';
    if (isScheduled && day.isFuture) return 'scheduled';
    if (day.isToday && isScheduled && !hasDose) return 'scheduled';
    
    return null;
  };

  const handleDayClick = (day: CalendarDay) => {
    if (!day.isClickable) return;
    
    onDayClick && onDayClick({
      ...day,
      doses: getDayDoses(day.dateString),
      checkin: getDayCheckin(day.dateString)
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        handleNavigate(1);
      } else {
        handleNavigate(-1);
      }
    }
  };

  const handleNavigate = (delta: number) => {
    setIsSliding(true);
    
    setTimeout(() => {
      if (viewMode === 'week') {
        setWeekOffset(prev => prev + delta);
      } else {
        setCurrentMonth(prev => {
          const newMonth = new Date(prev);
          newMonth.setMonth(newMonth.getMonth() + delta);
          return newMonth;
        });
      }
      
      setTimeout(() => {
        setIsSliding(false);
      }, 50);
    }, 150);
  };

  const goToToday = () => {
    setIsSliding(true);
    setTimeout(() => {
      if (viewMode === 'week') {
        setWeekOffset(0);
      } else {
        setCurrentMonth(new Date());
      }
      setTimeout(() => setIsSliding(false), 50);
    }, 150);
  };

  const getNavTitle = () => {
    if (viewMode === 'week') {
      if (weekOffset === 0) return 'Esta semana';
      if (weekOffset === -1) return 'Semana pasada';
      if (weekOffset === 1) return 'Próxima semana';
      if (weekOffset < 0) return `Hace ${Math.abs(weekOffset)} semanas`;
      return `En ${weekOffset} semanas`;
    } else {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    }
  };

  if (loading && days.length === 0) {
    return (
      <div className={styles.calendar}>
        <div className={styles.loading}>Cargando...</div>
      </div>
    );
  }

  const renderDayCard = (day: CalendarDay, index: number) => {
    const doseStatus = getDoseStatus(day);
    const hasCheckin = getDayCheckin(day.dateString);
    
    return (
      <div 
        key={index} 
        className={`
          ${styles.dayCard} 
          ${viewMode === 'month' ? styles.monthDayCard : ''}
          ${day.isToday ? styles.today : ''} 
          ${day.isFuture && !day.isFollowUpDay ? styles.future : ''} 
          ${day.isClickable ? styles.clickable : ''} 
          ${day.isFollowUpDay && !day.isFollowUpCompleted ? styles.followUpDay : ''}
          ${day.isFollowUpCompleted ? styles.followUpCompletedDay : ''}
          ${day.isOtherMonth ? styles.otherMonth : ''}
        `}
        onClick={() => handleDayClick(day)}
      >
        {viewMode === 'week' && (
          <div className={styles.weekday}>{day.weekday}</div>
        )}
        <div className={styles.dayNumber}>{day.day}</div>
        <div className={styles.indicators}>
          {doseStatus === 'taken' && (
            <Pill size={14} weight="fill" className={styles.doseIcon} />
          )}
          {doseStatus === 'missed' && (
            <Pill size={14} weight="fill" className={styles.doseIconMissed} />
          )}
          {doseStatus === 'scheduled' && (
            <Pill size={14} weight="fill" className={styles.doseIconScheduled} />
          )}
          {hasCheckin && <BookOpen size={12} weight="regular" className={styles.checkinIcon} />}
          {day.isFollowUpDay && !day.isFollowUpCompleted && <Calendar size={14} weight="fill" className={styles.followUpIcon} />}
          {day.isFollowUpCompleted && <Calendar size={14} weight="fill" className={styles.followUpCompletedIcon} />}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.viewToggle}>
        <button 
          className={`${styles.toggleButton} ${viewMode === 'week' ? styles.active : ''}`}
          onClick={() => setViewMode('week')}
        >
          Semana
        </button>
        <button 
          className={`${styles.toggleButton} ${viewMode === 'month' ? styles.active : ''}`}
          onClick={() => setViewMode('month')}
        >
          Mes
        </button>
      </div>

      <div className={styles.navTitle} onClick={goToToday}>
        {getNavTitle()}
      </div>

      {viewMode === 'week' ? (
        <div className={styles.calendarWrapper}>
          <button className={styles.sideArrow} onClick={() => handleNavigate(-1)}>
            <CaretLeft size={18} weight="bold" />
          </button>
          <div 
            className={`${styles.weekDays} ${isSliding ? styles.sliding : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {days.map((day, index) => renderDayCard(day, index))}
          </div>
          <button className={styles.sideArrow} onClick={() => handleNavigate(1)}>
            <CaretRight size={18} weight="bold" />
          </button>
        </div>
      ) : (
        <div className={styles.calendarWrapper}>
          <button className={styles.sideArrow} onClick={() => handleNavigate(-1)}>
            <CaretLeft size={18} weight="bold" />
          </button>
          <div 
            className={`${styles.monthContainer} ${isSliding ? styles.sliding : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className={styles.weekHeaders}>
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className={styles.weekHeader}>{d}</div>
              ))}
            </div>
            <div className={styles.monthGrid}>
              {days.map((day, index) => renderDayCard(day, index))}
            </div>
          </div>
          <button className={styles.sideArrow} onClick={() => handleNavigate(1)}>
            <CaretRight size={18} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
};

export default WeeklyCalendar;
