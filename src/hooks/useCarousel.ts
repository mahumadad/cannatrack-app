import { useState, useRef, useCallback } from 'react';

interface UseCarouselReturn {
  activeCard: number;
  carouselRef: React.RefObject<HTMLDivElement>;
  handleCarouselScroll: () => void;
  scrollToCard: (index: number) => void;
}

export function useCarousel(): UseCarouselReturn {
  const [activeCard, setActiveCard] = useState<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.getBoundingClientRect().width || 1;
    const gap = 16;
    const index = Math.round(el.scrollLeft / (cardWidth + gap));
    setActiveCard(index);
  }, []);

  const scrollToCard = useCallback((index: number) => {
    const el = carouselRef.current;
    if (!el || !el.firstElementChild) return;
    const cardWidth = el.firstElementChild.getBoundingClientRect().width;
    const gap = 16;
    el.scrollTo({ left: index * (cardWidth + gap), behavior: 'smooth' });
  }, []);

  return { activeCard, carouselRef, handleCarouselScroll, scrollToCard };
}
