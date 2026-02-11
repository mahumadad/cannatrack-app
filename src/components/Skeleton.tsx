import React from 'react';
import styles from './Skeleton.module.css';

interface Props {
  type?: string;
  width?: string;
  height?: string;
  count?: number;
}

const Skeleton: React.FC<Props> = ({ type = 'text', width, height, count = 1 }) => {
  const items: number[] = Array.from({ length: count }, (_, i) => i);

  const getStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};
    if (width) style.width = width;
    if (height) style.height = height;
    return style;
  };

  return (
    <>
      {items.map(i => (
        <div
          key={i}
          className={`${styles.skeleton} ${styles[type]}`}
          style={getStyle()}
        />
      ))}
    </>
  );
};

export const SkeletonCard: React.FC = () => (
  <div className={styles.card}>
    <Skeleton type="title" width="60%" />
    <Skeleton type="text" count={3} />
    <Skeleton type="button" width="40%" />
  </div>
);

export const SkeletonCalendar: React.FC = () => (
  <div className={styles.calendarSkeleton}>
    {Array.from({ length: 7 }, (_, i) => (
      <Skeleton key={i} type="circle" width="50px" height="70px" />
    ))}
  </div>
);

export default Skeleton;
