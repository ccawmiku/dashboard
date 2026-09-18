import type { ReactNode } from 'react';
import styles from './Card.module.css';
export function Card({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <article className={styles.card} aria-label={label}>
      {children}
    </article>
  );
}
