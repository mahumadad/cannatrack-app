import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';
import { useUserRecord, useSaveBaseline, useMarkOnboarding } from '../hooks/queries';
import {
  NotePencil,
  Clock,
  ArrowRight,
  ArrowLeft
} from '@phosphor-icons/react';
import styles from './Onboarding.module.css';
import { useUser } from '../hooks/useUser';

interface OnboardingData {
  usual_focus: number;
  usual_creativity: number;
  usual_energy: number;
  life_satisfaction: number;
  [key: string]: number;
}

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const { user } = useUser();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<OnboardingData>({
    usual_focus: 5,
    usual_creativity: 5,
    usual_energy: 5,
    life_satisfaction: 5,
  });

  const { data: userData } = useUserRecord(user?.id);
  const saveBaseline = useSaveBaseline();
  const markOnboarding = useMarkOnboarding(user?.id);

  useEffect(() => {
    if (!user?.id) {
      if (user !== null) navigate('/login');
      return;
    }
  }, [user]);

  useEffect(() => {
    if (userData?.onboarding_completed) {
      navigate('/dashboard');
      return;
    }
    if (userData) setLoading(false);
  }, [userData]);

  const totalSteps = 4;
  const showcaseSteps = 3; // steps 0, 1, 2

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (!user?.id) return;

    try {
      await saveBaseline.mutateAsync({
        user_id: user.id,
        usual_focus: data.usual_focus,
        usual_creativity: data.usual_creativity,
        usual_energy: data.usual_energy,
        life_satisfaction: data.life_satisfaction,
      });

      await markOnboarding.mutateAsync();

      navigate('/dashboard');
    } catch (error) {
      toast!.error('Error al completar onboarding');
    }
  };

  if (loading) {
    return (
      <div className={styles.onboarding}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
        </div>
      </div>
    );
  }

  const isShowcase = currentStep < showcaseSteps;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className={styles.showcaseSlide}>
            <div className={styles.heroArea}>
              <div className={styles.heroGlow}></div>
              <div className={styles.heroImage}>
                <img src="/logo-camellos.png" alt="Camellos & Dromedarios" className={styles.heroLogo} />
                <div className={styles.heroOverlay}></div>
              </div>
            </div>
            <div className={styles.showcaseText}>
              <div className={styles.iconBadge}>🌿</div>
              <h1 className={styles.showcaseTitle}>
                Bienvenido a tu camino de auto-investigación
              </h1>
              <p className={styles.showcaseDesc}>
                DromedApp te acompaña en tu proceso de microdosis, ayudándote a registrar y entender tu experiencia de manera segura.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className={styles.showcaseSlide}>
            <div className={styles.illustrationCircle}>
              <div className={styles.illustrationGradient}></div>
              <div className={styles.illustrationInner}>
                <div className={styles.illustrationRing}></div>
                <NotePencil size={80} weight="light" />
              </div>
              <div className={styles.floatingDot1}></div>
              <div className={styles.floatingDot2}></div>
            </div>
            <div className={styles.showcaseText}>
              <h2 className={styles.showcaseTitle}>Registra tu estado</h2>
              <p className={styles.showcaseDesc}>
                Reflexiona sobre tus días y observa patrones en tu bienestar emocional y cognitivo.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className={styles.showcaseSlide}>
            <div className={styles.illustrationCircle}>
              <div className={styles.illustrationGradient}></div>
              <div className={styles.illustrationInner}>
                <div className={styles.illustrationRing}></div>
                <Clock size={80} weight="light" />
              </div>
              <div className={styles.floatingDot1}></div>
              <div className={styles.floatingDot2}></div>
            </div>
            <div className={styles.showcaseText}>
              <h2 className={styles.showcaseTitle}>Desarrolla una rutina</h2>
              <p className={styles.showcaseDesc}>
                Lleva un registro de tus dosis diarias y realiza check-ins para monitorear tu progreso y bienestar.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className={styles.sliderStep}>
            <div className={styles.sliderStepHeader}>
              <h1 className={styles.sliderStepTitle}>Tu estado base</h1>
              <p className={styles.sliderStepDesc}>
                Define tu nivel actual en estas áreas antes de comenzar el protocolo. Sé honesto contigo mismo.
              </p>
            </div>
            <div className={styles.slidersContainer}>
              {[
                { key: 'usual_energy', label: 'Energía', icon: '⚡', low: 'Baja', high: 'Alta' },
                { key: 'usual_focus', label: 'Enfoque', icon: '🎯', low: 'Disperso', high: 'Enfocado' },
                { key: 'usual_creativity', label: 'Creatividad', icon: '✨', low: 'Bloqueado', high: 'Fluido' },
                { key: 'life_satisfaction', label: 'Satisfacción', icon: '😊', low: 'Insatisfecho', high: 'Pleno' },
              ].map(({ key, label, icon, low, high }) => (
                <div key={key} className={styles.sliderRow}>
                  <div className={styles.sliderLabel}>
                    <span className={styles.sliderIcon}>{icon}</span>
                    <span className={styles.sliderLabelText}>{label}</span>
                    <span className={styles.sliderValueBadge}>{data[key]}/10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={data[key]}
                    onChange={(e) => setData(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                    className={styles.slider}
                    style={{
                      background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${data[key] * 10}%, var(--color-border) ${data[key] * 10}%, var(--color-border) 100%)`
                    }}
                  />
                  <div className={styles.sliderScale}>
                    <span>{low}</span>
                    <span>{high}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.decorativeBar}>
              <span className={styles.decorativeIcon}>📊</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.onboarding}>
      {isShowcase ? (
        <>
          {/* Absolute skip button */}
          <div className={styles.topBar}>
            <div className={styles.topBarSpacer}></div>
            <button className={styles.skipButton} onClick={() => setCurrentStep(3)}>
              Omitir
            </button>
          </div>

          {/* Centered column with slide + dots + CTA */}
          <div className={styles.showcaseLayout}>
            {renderStep()}

            {/* Progress dots */}
            <div className={styles.progressDots}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`${styles.dot} ${i === currentStep ? styles.dotActive : ''} ${i < currentStep ? styles.dotCompleted : ''}`}
                />
              ))}
            </div>

            {/* CTA Button */}
            <button className={styles.ctaButton} onClick={handleNext}>
              <span>{currentStep === 0 ? 'Comenzar' : 'Siguiente'}</span>
              <ArrowRight size={20} weight="bold" />
            </button>

            {/* Legal text on welcome only */}
            {currentStep === 0 && (
              <p className={styles.legalText}>
                Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Header with back */}
          <header className={styles.sliderHeader}>
            <button className={styles.headerBack} onClick={handleBack}>
              <ArrowLeft size={24} weight="bold" />
            </button>
            <h2 className={styles.headerTitle}>Onboarding</h2>
            <div className={styles.headerSpacer}></div>
          </header>

          {/* Segmented progress */}
          <div className={styles.progressSegments}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`${styles.segment} ${i <= currentStep ? styles.segmentFilled : ''}`}
              />
            ))}
          </div>

          {/* Scrollable content */}
          <main className={styles.sliderContent}>
            {renderStep()}
          </main>

          {/* Fixed bottom button */}
          <div className={styles.fixedFooter}>
            <button className={styles.ctaButton} onClick={handleComplete}>
              <span>Guardar y Empezar</span>
              <ArrowRight size={20} weight="bold" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Onboarding;
