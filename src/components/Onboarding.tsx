import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from './Toast';
import {
  Sparkle,
  NotePencil,
  Clock,
  ChartLineUp,
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

  useEffect(() => {
    if (!user?.id) {
      if (user !== null) navigate('/login');
      return;
    }
    checkOnboardingStatus(user.id);
  }, [user]);

  const checkOnboardingStatus = async (userId: string) => {
    try {
      const userData = await api.get(`/api/users/${userId}`);
      if (userData?.onboarding_completed) {
        navigate('/dashboard');
        return;
      }
    } catch (error) {
      toast!.error('Error al verificar onboarding');
    }
    setLoading(false);
  };

  const totalSteps = 5;

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
      await api.post('/api/baseline', {
        user_id: user.id,
        usual_focus: data.usual_focus,
        usual_creativity: data.usual_creativity,
        usual_energy: data.usual_energy,
        life_satisfaction: data.life_satisfaction,
      });

      await api.put(`/api/users/${user.id}/onboarding`, { completed: true });

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

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className={styles.slideContent}>
            <p className={styles.welcomeTitle}>Bienvenido a</p>
            <div className={styles.logoContainer}>
              <img src="/logo-camellos.png" alt="Camellos & Dromedarios" className={styles.logo} />
            </div>
            <p className={styles.subtitle}>Tu compañero de microdosificación</p>
          </div>
        );

      case 1:
        return (
          <div className={styles.slideContent}>
            <div className={styles.iconCircle}>
              <NotePencil size={64} weight="light" />
            </div>
            <h2 className={styles.slideTitle}>Registra tu estado</h2>
            <p className={styles.slideDescription}>
              Reflexiona sobre tus días & observa patrones en tu bienestar
            </p>
          </div>
        );

      case 2:
        return (
          <div className={styles.slideContent}>
            <div className={styles.iconCircle}>
              <Clock size={64} weight="light" />
            </div>
            <h2 className={styles.slideTitle}>Desarrolla una rutina</h2>
            <p className={styles.slideDescription}>
              Elige tu protocolo, registra tus dosis & mantén consistencia
            </p>
          </div>
        );

      case 3:
        return (
          <div className={styles.slideContent}>
            <div className={styles.iconCircle}>
              <ChartLineUp size={64} weight="light" />
            </div>
            <h2 className={styles.slideTitle}>Aprende de tu viaje</h2>
            <p className={styles.slideDescription}>
              Monitorea cambios & descubre qué funciona para ti
            </p>
          </div>
        );

      case 4:
        return (
          <div className={styles.slideContent}>
            <h2 className={styles.slideTitle}>¿Cómo te sientes?</h2>
            <p className={styles.slideDescription}>Generalmente estos días</p>
            <div className={styles.slidersContainer}>
              {[
                { key: 'usual_energy', label: 'Energía', emoji: '⚡' },
                { key: 'usual_focus', label: 'Enfoque', emoji: '🎯' },
                { key: 'usual_creativity', label: 'Creatividad', emoji: '✨' },
                { key: 'life_satisfaction', label: 'Satisfacción', emoji: '😊' },
              ].map(({ key, label, emoji }) => (
                <div key={key} className={styles.sliderRow}>
                  <div className={styles.sliderLabel}>
                    <span>{emoji}</span>
                    <span>{label}</span>
                    <span className={styles.sliderValue}>{data[key]}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={data[key]}
                    onChange={(e) => setData(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                    className={styles.slider}
                  />
                  <div className={styles.sliderScale}>
                    <span>Bajo</span>
                    <span>Alto</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.onboarding}>
      {currentStep > 0 && currentStep < 4 && (
        <button className={styles.skipButton} onClick={() => setCurrentStep(4)}>
          Saltar
        </button>
      )}

      <div className={styles.progressDots}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`${styles.dot} ${index === currentStep ? styles.active : ''} ${index < currentStep ? styles.completed : ''}`}
          />
        ))}
      </div>

      <div className={styles.content}>
        {renderStep()}
      </div>

      <div className={styles.navigation}>
        <div className={styles.navButtons}>
          {currentStep > 0 && (
            <button className={styles.backButton} onClick={handleBack}>
              <ArrowLeft size={20} weight="bold" />
            </button>
          )}
          
          {currentStep < totalSteps - 1 ? (
            <button 
              className={styles.nextButton} 
              onClick={handleNext}
            >
              {currentStep === 0 ? 'Comenzar' : 'Siguiente'}
              <ArrowRight size={20} weight="bold" />
            </button>
          ) : (
            <button 
              className={styles.completeButton} 
              onClick={handleComplete}
            >
              Comenzar mi viaje
              <Sparkle size={20} weight="fill" />
            </button>
          )}
        </div>
      </div>

      <div className={styles.wave}></div>
    </div>
  );
};

export default Onboarding;
