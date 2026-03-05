import { useState, useEffect, useMemo } from 'react';
import type { CartItem, ProductCatalog, Receta } from '../types';

/** Parse grams from string like "0.2g", "0.2 g", "200mg" */
const parseGrams = (str: string): number => {
  if (!str) return 0;
  const s = str.trim().toLowerCase();
  const mgMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*mg$/);
  if (mgMatch) return parseFloat(mgMatch[1].replace(',', '.')) / 1000;
  const gMatch = s.match(/(\d+(?:[.,]\d+)?)\s*g/);
  if (gMatch) return parseFloat(gMatch[1].replace(',', '.'));
  return 0;
};

export interface UseSolicitudCartReturn {
  cart: CartItem[];
  cartTotal: number;
  // Micro selection
  selectedGramaje: string | null;
  setSelectedGramaje: (v: string | null) => void;
  selectedCapsulas: string | null;
  setSelectedCapsulas: (v: string | null) => void;
  microQty: number;
  setMicroQty: React.Dispatch<React.SetStateAction<number>>;
  // Macro selection
  selectedMacro: string | null;
  setSelectedMacro: (v: string | null) => void;
  macroCategory: string;
  setMacroCategory: (v: string) => void;
  // Actions
  addMicroToCart: () => void;
  addMacroToCart: (macroKey?: string) => void;
  removeFromCart: (id: string) => void;
  // Derived
  hasMicro: boolean;
  hasMacro: boolean;
  cartMicroCaps: number;
  cartMacroGrams: number;
  cartMicroTotalGrams: number;
  cartMicroGramajes: string[];
  microEquiv: number;
  microGramsExceeded: boolean;
  recetaMicroTotalGramsAuth: number;
  recetaMacroTotalGramsAuth: number;
  recetaMacroGramsMax: number;
  // Recetas
  recetaMicroConSaldo: Receta | null;
  recetaMacroConSaldo: Receta | null;
  hasAnyReceta: boolean;
  recetaMicro: Receta | null;
  recetaMacro: Receta | null;
}

export function useSolicitudCart(
  catalog: ProductCatalog | undefined,
  recetasActivas: Receta[],
  onAddToast: (msg: string) => void
): UseSolicitudCartReturn {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [preselected, setPreselected] = useState(false);

  // Micro selection state
  const [selectedGramaje, setSelectedGramaje] = useState<string | null>(null);
  const [selectedCapsulas, setSelectedCapsulas] = useState<string | null>(null);
  const [microQty, setMicroQty] = useState(1);

  // Macro selection state
  const [selectedMacro, setSelectedMacro] = useState<string | null>(null);
  const [macroCategory, setMacroCategory] = useState('');

  // Derived recetas
  const recetaMicroConSaldo = recetasActivas.find(r => r.total_micro_autorizado > 0 && r.saldo_micro > 0) || null;
  const recetaMacroConSaldo = recetasActivas.find(r => r.total_macro_autorizado > 0 && r.saldo_macro > 0) || null;
  const hasAnyReceta = recetasActivas.length > 0;
  const recetaMicro = hasAnyReceta ? recetasActivas[0] : null;
  const recetaMacro = hasAnyReceta ? recetasActivas[0] : null;

  // Auto-select gramaje and max capsulas from active micro receta once catalog loads
  useEffect(() => {
    if (!catalog || preselected) return;

    if (recetaMicroConSaldo?.gramaje_micro && recetaMicroConSaldo.saldo_micro > 0) {
      const matchingGramaje = catalog.microdosis.find(m =>
        m.gramaje.replace(/\s/g, '').toLowerCase() === recetaMicroConSaldo.gramaje_micro!.replace(/\s/g, '').toLowerCase()
      );
      if (matchingGramaje) {
        setSelectedGramaje(matchingGramaje.gramaje);
        const sortedOptions = [...matchingGramaje.options].sort(
          (a, b) => parseInt(b.capsulas) - parseInt(a.capsulas)
        );
        const bestFit = sortedOptions.find(o => parseInt(o.capsulas) <= recetaMicroConSaldo.saldo_micro);
        if (bestFit) {
          setSelectedCapsulas(bestFit.capsulas);
        } else {
          const smallest = sortedOptions[sortedOptions.length - 1];
          if (smallest) setSelectedCapsulas(smallest.capsulas);
        }
      }
    }

    if (recetaMacroConSaldo?.gramaje_macro && recetaMacroConSaldo.saldo_macro > 0) {
      const maxGrams = parseFloat(recetaMacroConSaldo.gramaje_macro.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
      if (maxGrams > 0) {
        const sorted = [...catalog.macrodosis].sort((a, b) => (b.grams || 0) - (a.grams || 0));
        const bestFit = sorted.find(m => (m.grams || 0) <= maxGrams);
        if (bestFit) {
          setSelectedMacro(bestFit.key);
          if (!cart.some(i => i.category === 'Macrodosis')) {
            setCart(prev => [...prev, {
              id: `macro-${bestFit.key}-${Date.now()}`,
              category: 'Macrodosis',
              producto: bestFit.key,
              displayLabel: bestFit.label,
              unitPrice: bestFit.price,
              quantity: 1,
              lineTotal: bestFit.price
            } as CartItem]);
          }
        }
      }
    }

    setPreselected(true);
  }, [catalog, recetaMicroConSaldo, recetaMacroConSaldo, preselected]);

  // Derived values
  const derived = useMemo(() => {
    const hasMicro = cart.some(i => i.category === 'Microdosis');
    const hasMacro = cart.some(i => i.category === 'Macrodosis');
    const cartTotal = cart.reduce((sum, i) => sum + i.lineTotal, 0);
    const cartMicroCaps = cart.filter(i => i.category === 'Microdosis').reduce((sum, i) => sum + parseInt(i.capsulas || '0') * (i.quantity || 1), 0);
    const cartMacroGrams = cart.filter(i => i.category === 'Macrodosis').reduce((sum, i) => {
      const producto = catalog?.macrodosis.find(m => m.key === i.producto);
      return sum + (producto?.grams || 0) * (i.quantity || 1);
    }, 0);
    const recetaMacroGramsMax = recetaMacroConSaldo?.gramaje_macro
      ? parseFloat(recetaMacroConSaldo.gramaje_macro.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0
      : 0;
    const cartMicroGramajes = [...new Set(cart.filter(i => i.category === 'Microdosis').map(i => i.gramaje))];
    const cartMicroTotalGrams = cart.filter(i => i.category === 'Microdosis').reduce((sum, i) => {
      return sum + parseGrams(i.gramaje || '') * parseInt(i.capsulas || '0') * (i.quantity || 1);
    }, 0);
    const recetaMacroTotalGramsAuth = recetaMacroConSaldo
      ? recetaMacroGramsMax * (recetaMacroConSaldo.saldo_macro || 0)
      : 0;
    const recetaMicroGramPerCap = recetaMicroConSaldo?.gramaje_micro ? parseGrams(recetaMicroConSaldo.gramaje_micro) : 0;
    const recetaMicroTotalGramsAuth = recetaMicroConSaldo
      ? recetaMicroGramPerCap * (recetaMicroConSaldo.saldo_micro || 0)
      : 0;
    const microGramsExceeded = recetaMicroTotalGramsAuth > 0 && cartMicroTotalGrams > recetaMicroTotalGramsAuth;
    const microEquiv = recetaMicroGramPerCap > 0 && cartMicroTotalGrams > 0
      ? Math.ceil(cartMicroTotalGrams / recetaMicroGramPerCap)
      : cartMicroCaps;

    return {
      hasMicro, hasMacro, cartTotal, cartMicroCaps, cartMacroGrams,
      recetaMacroGramsMax, cartMicroGramajes, cartMicroTotalGrams,
      recetaMacroTotalGramsAuth, recetaMicroTotalGramsAuth,
      microGramsExceeded, microEquiv,
    };
  }, [cart, catalog, recetaMicroConSaldo, recetaMacroConSaldo]);

  // Actions
  const addMicroToCart = () => {
    if (!selectedGramaje || !selectedCapsulas || !catalog) return;
    const gramaje = catalog.microdosis.find(m => m.gramaje === selectedGramaje);
    const option = gramaje?.options.find(o => o.capsulas === selectedCapsulas);
    if (!gramaje || !option) return;

    const item: CartItem = {
      id: `micro-${selectedGramaje}-${selectedCapsulas}-${Date.now()}`,
      category: 'Microdosis',
      gramaje: selectedGramaje,
      capsulas: selectedCapsulas,
      displayLabel: `${gramaje.label} x ${selectedCapsulas} caps`,
      unitPrice: option.price,
      quantity: microQty,
      lineTotal: option.price * microQty
    };

    setCart(prev => [...prev, item]);
    setSelectedGramaje(null);
    setSelectedCapsulas(null);
    setMicroQty(1);
    onAddToast('Agregado al carrito');
  };

  const addMacroToCart = (macroKey?: string) => {
    const key = macroKey || selectedMacro;
    if (!key || !catalog) return;
    const producto = catalog.macrodosis.find(m => m.key === key);
    if (!producto) return;

    const item: CartItem = {
      id: `macro-${key}-${Date.now()}`,
      category: 'Macrodosis',
      producto: key,
      displayLabel: producto.label,
      unitPrice: producto.price,
      quantity: 1,
      lineTotal: producto.price
    };

    setCart(prev => [...prev, item]);
    setSelectedMacro(null);
    onAddToast('Agregado al carrito');
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  return {
    cart, ...derived,
    selectedGramaje, setSelectedGramaje,
    selectedCapsulas, setSelectedCapsulas,
    microQty, setMicroQty,
    selectedMacro, setSelectedMacro,
    macroCategory, setMacroCategory,
    addMicroToCart, addMacroToCart, removeFromCart,
    recetaMicroConSaldo, recetaMacroConSaldo,
    hasAnyReceta, recetaMicro, recetaMacro,
  };
}
