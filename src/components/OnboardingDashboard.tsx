import React from 'react';
import { CheckCircle, PencilSimple, CreditCard, FileText, Sparkle } from '@phosphor-icons/react';
import styles from './OnboardingDashboard.module.css';

interface OnboardingDashboardProps {
  onboardingState: string;
  signingUrl?: string | null;
  paymentUrl?: string | null;
  contractSigned?: boolean;
  membershipStatus: string;
}

interface Step {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'active' | 'pending';
  ctaUrl?: string | null;
  ctaLabel?: string;
}

const OnboardingDashboard: React.FC<OnboardingDashboardProps> = ({
  onboardingState,
  signingUrl,
  paymentUrl,
  contractSigned,
  membershipStatus
}) => {
  const getSteps = (): Step[] => {
    const isPaid = membershipStatus === 'active' || membershipStatus === 'pending_signing';
    const isSigned = !!contractSigned;
    const isActive = membershipStatus === 'active' || onboardingState === 'active';

    return [
      {
        key: 'inscripcion',
        title: 'Inscripci\u00f3n',
        description: 'Documentaci\u00f3n enviada',
        icon: <FileText size={16} weight="bold" />,
        status: 'completed'
      },
      {
        key: 'revision',
        title: 'Revisi\u00f3n',
        description: onboardingState === 'applied' || onboardingState === 'reviewing'
          ? 'Tu documentaci\u00f3n est\u00e1 siendo revisada'
          : 'Documentaci\u00f3n aprobada',
        icon: <PencilSimple size={16} weight="bold" />,
        status: onboardingState === 'applied' || onboardingState === 'reviewing'
          ? 'active'
          : ['approved', 'contract_pending', 'payment_pending', 'activating', 'active'].includes(onboardingState)
            ? 'completed'
            : 'pending'
      },
      {
        key: 'firma',
        title: 'Firma de contrato',
        description: isSigned
          ? 'Contrato firmado'
          : 'Firma electr\u00f3nica del contrato de membres\u00eda',
        icon: <PencilSimple size={16} weight="bold" />,
        status: isSigned ? 'completed'
          : (onboardingState === 'contract_pending' || (onboardingState === 'approved' && !isSigned))
            ? 'active'
            : ['approved', 'payment_pending', 'activating', 'active'].includes(onboardingState) && !isSigned
              ? 'active'
              : 'pending',
        ctaUrl: !isSigned ? signingUrl : null,
        ctaLabel: 'Firmar contrato'
      },
      {
        key: 'pago',
        title: 'Pago de membres\u00eda',
        description: isPaid
          ? 'Suscripci\u00f3n activa'
          : 'Activa tu suscripci\u00f3n mensual',
        icon: <CreditCard size={16} weight="bold" />,
        status: isPaid ? 'completed'
          : (onboardingState === 'payment_pending' || (onboardingState === 'approved' && !isPaid))
            ? 'active'
            : ['approved', 'contract_pending', 'activating', 'active'].includes(onboardingState) && !isPaid
              ? 'active'
              : 'pending',
        ctaUrl: !isPaid ? paymentUrl : null,
        ctaLabel: 'Pagar membres\u00eda'
      },
      {
        key: 'activacion',
        title: 'Activaci\u00f3n',
        description: isActive
          ? '\u00a1Membres\u00eda activa!'
          : 'Se activa autom\u00e1ticamente al completar firma y pago',
        icon: <Sparkle size={16} weight="bold" />,
        status: isActive ? 'completed'
          : onboardingState === 'activating' ? 'active'
            : 'pending'
      }
    ];
  };

  const steps = getSteps();
  const completedCount = steps.filter(s => s.status === 'completed').length;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Tu progreso de activaci\u00f3n</h2>
      <p className={styles.subtitle}>{completedCount} de {steps.length} pasos completados</p>

      <div className={styles.steps}>
        {steps.map((step) => (
          <div key={step.key} className={`${styles.step} ${styles[step.status]}`}>
            <div className={`${styles.stepIcon} ${styles[step.status]}`}>
              {step.status === 'completed' ? (
                <CheckCircle size={18} weight="fill" />
              ) : (
                step.icon
              )}
            </div>
            <div className={styles.stepContent}>
              <p className={styles.stepTitle}>{step.title}</p>
              <p className={styles.stepDesc}>{step.description}</p>
              {step.status === 'active' && step.ctaUrl && (
                <a
                  href={step.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.ctaPrimary}
                  style={{ textDecoration: 'none', marginTop: '8px', display: 'inline-flex' }}
                >
                  {step.ctaLabel}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.infoBox}>
        Puedes completar la firma y el pago en cualquier orden. Tu membres\u00eda se activar\u00e1 autom\u00e1ticamente cuando ambos est\u00e9n listos.
      </div>
    </div>
  );
};

export default OnboardingDashboard;
