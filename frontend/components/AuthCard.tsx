import type { ReactNode } from 'react';
import './AuthCard.css';

interface AuthCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}

export default function AuthCard({ icon, title, subtitle, children, wide }: AuthCardProps) {
  return (
    <div className="auth-page">
      <div className="auth-page__glow auth-page__glow--a" />
      <div className="auth-page__glow auth-page__glow--b" />

      <div className={`auth-card ${wide ? 'auth-card--wide' : ''}`}>
        <div className="auth-card__badge">{icon}</div>
        <h1 className="auth-card__title">{title}</h1>
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
