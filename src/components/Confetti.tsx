import React, { useEffect, useState } from 'react';
import styles from './Confetti.module.css';

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotation: number;
}

interface Props {
  active: boolean;
  onComplete?: () => void;
}

const Confetti: React.FC<Props> = ({ active, onComplete }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) {
      const colors: string[] = ['#C17D4A', '#D4A574', '#4CAF50', '#FF9800', '#9C27B0', '#2196F3'];
      const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1 + Math.random() * 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 8,
        rotation: Math.random() * 360
      }));
      setParticles(newParticles);

      setTimeout(() => {
        setParticles([]);
        onComplete && onComplete();
      }, 2500);
    }
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className={styles.confettiContainer}>
      {particles.map(p => (
        <div
          key={p.id}
          className={styles.particle}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            transform: `rotate(${p.rotation}deg)`
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
