import React from 'react';
import { useNavigate } from 'react-router-dom';
import { House, BookOpen, ChartLine, UserCircle, Plus } from '@phosphor-icons/react';
import styles from './BottomNav.module.css';

interface BottomNavProps {
  activePage: 'dashboard' | 'reflect' | 'insights' | 'settings' | 'none';
  onFabPress?: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activePage, onFabPress }) => {
  const navigate = useNavigate();

  const handleFabPress = () => {
    if (onFabPress) {
      onFabPress();
    } else {
      navigate('/dashboard?dose=1');
    }
  };

  const navItems: { key: string; icon: typeof House; label: string; route: string }[] = [
    { key: 'dashboard', icon: House, label: 'Inicio', route: '/dashboard' },
    { key: 'reflect', icon: BookOpen, label: 'Diario', route: '/reflect' },
    { key: 'insights', icon: ChartLine, label: 'Reportes', route: '/insights' },
    { key: 'settings', icon: UserCircle, label: 'Perfil', route: '/settings' },
  ];

  const leftItems = navItems.slice(0, 2);
  const rightItems = navItems.slice(2);

  return (
    <nav className={styles.bottomNav}>
      {leftItems.map(item => {
        const isActive = activePage === item.key;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            className={`${styles.navButton} ${isActive ? styles.active : ''}`}
            onClick={() => !isActive && navigate(item.route)}
          >
            <Icon size={24} weight={isActive ? 'fill' : 'regular'} className={styles.navIcon} />
            <span className={isActive ? styles.navLabelActive : styles.navLabel}>{item.label}</span>
          </button>
        );
      })}

      <div className={styles.fabContainer}>
        <button className={styles.fab} onClick={handleFabPress}>
          <Plus size={28} weight="bold" />
        </button>
      </div>

      {rightItems.map(item => {
        const isActive = activePage === item.key;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            className={`${styles.navButton} ${isActive ? styles.active : ''}`}
            onClick={() => !isActive && navigate(item.route)}
          >
            <Icon size={24} weight={isActive ? 'fill' : 'regular'} className={styles.navIcon} />
            <span className={isActive ? styles.navLabelActive : styles.navLabel}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
