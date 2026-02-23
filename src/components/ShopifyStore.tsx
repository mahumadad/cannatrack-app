import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from './Toast';
import { Package, Truck, ArrowsClockwise, Receipt, ShoppingBag, ArrowLeft, MapPin, Tag, CurrencyDollar, Prescription, ClipboardText, Plus, CreditCard, CaretDown, CaretUp, CheckCircle } from '@phosphor-icons/react';
import styles from './ShopifyStore.module.css';
import BottomNav from './BottomNav';
import { useUser } from '../hooks/useUser';
import api from '../utils/api';
import storage, { STORAGE_KEYS } from '../utils/storage';
import { useRecetasQuery, useStoreData, useSolicitudes, useMembershipSubscribe } from '../hooks/queries';
import { formatCLP } from '../utils/formatters';
import useSwipeBack from '../hooks/useSwipeBack';
import type { ShopifyOrder, ShopifySubscription, ShopifyStoreData, Receta, Solicitud } from '../types';

type Tab = 'orders' | 'subscriptions' | 'solicitudes' | 'recetas';

const ShopifyStore: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast()!;
  const { user } = useUser();
  const { data: allRecetas = [], isLoading: loadingRecetas } = useRecetasQuery(user?.id);
  const recetasActivas = allRecetas.filter((r: Receta) => r.estado === 'activa');
  const recetasPasadas = allRecetas.filter((r: Receta) => r.estado !== 'activa');
  const { data: storeData, isLoading: loadingStore, isError: storeError } = useStoreData(user?.id);
  const { data: solicitudes = [], isLoading: loadingSolicitudes } = useSolicitudes(user?.id);
  const loading = loadingStore || loadingRecetas || loadingSolicitudes || membershipLoading;
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  useSwipeBack();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [expandedRecetaId, setExpandedRecetaId] = useState<string | null>(null);

  // Membership — init from localStorage (synced by ProtectedRoute) to avoid flash
  const subscribeMutation = useMembershipSubscribe();
  const storedUser = user as Record<string, unknown> | null;
  const [membershipStatus, setMembershipStatus] = useState<string>(
    (storedUser?.membership_status as string) || 'none'
  );
  const [membershipExpires, setMembershipExpires] = useState<string | null>(
    (storedUser?.membership_expires_at as string) || null
  );
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionProcessing, setSubscriptionProcessing] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Refresh membership data from API (confirm latest state)
  useEffect(() => {
    if (!user?.id) { setMembershipLoading(false); return; }
    api.get('/api/auth/verify')
      .then((data: { user?: { membership_status?: string; membership_expires_at?: string } }) => {
        if (data?.user) {
          setMembershipStatus(data.user.membership_status || 'none');
          setMembershipExpires(data.user.membership_expires_at || null);
        }
      })
      .catch(() => {})
      .finally(() => setMembershipLoading(false));
  }, [user?.id]);

  // Detect query params from Flow callback redirect
  useEffect(() => {
    const subParam = searchParams.get('subscription');
    if (subParam === 'processing' || subParam === 'active') {
      setSubscriptionProcessing(true);
      searchParams.delete('subscription');
      setSearchParams(searchParams, { replace: true });
    }
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errors: Record<string, string> = {
        card_not_registered: 'No se completó el registro de tarjeta',
        registration_failed: 'Error en el registro de tarjeta',
        missing_params: 'Error en la redirección',
        unexpected: 'Error inesperado'
      };
      toast.error(errors[errorParam] || 'Error en el proceso de pago');
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatPrice = (amount: string, currency: string): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: currency || 'CLP',
      maximumFractionDigits: 0
    }).format(parseFloat(amount));
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusLabel = (status: string): { text: string; className: string } => {
    const map: Record<string, { text: string; className: string }> = {
      FULFILLED: { text: 'Entregado', className: styles.statusFulfilled },
      UNFULFILLED: { text: 'En proceso', className: styles.statusUnfulfilled },
      PARTIALLY_FULFILLED: { text: 'Parcial', className: styles.statusPartial },
      PAID: { text: 'Pagado', className: styles.statusPaid },
      PENDING: { text: 'Pendiente', className: styles.statusPending },
      ACTIVE: { text: 'Activa', className: styles.statusActive },
      PAUSED: { text: 'Pausada', className: styles.statusPaused },
      CANCELLED: { text: 'Cancelada', className: styles.statusCancelled },
      IN_TRANSIT: { text: 'En camino', className: styles.statusInTransit },
      DELIVERED: { text: 'Entregado', className: styles.statusFulfilled },
    };
    return map[status] || { text: status || 'Desconocido', className: styles.statusDefault };
  };

  const renderRecetaBanner = () => {
    if (recetasActivas.length === 0) {
      return (
        <div className={styles.recetaBanner} onClick={() => navigate('/store/solicitud')}>
          <div className={styles.recetaBannerContent}>
            <Prescription size={24} weight="bold" className={styles.recetaBannerIcon} />
            <div>
              <p className={styles.recetaBannerTitle}>Nuevo pedido con receta</p>
              <p className={styles.recetaBannerSubtitle}>Solicita tus productos con tu prescripción</p>
            </div>
          </div>
          <Plus size={20} weight="bold" className={styles.recetaBannerArrow} />
        </div>
      );
    }

    // Aggregate saldos across all active recetas
    const totalMicroAutorizado = recetasActivas.reduce((sum, r) => sum + (r.total_micro_autorizado || 0), 0);
    const totalMicroSaldo = recetasActivas.reduce((sum, r) => sum + (r.saldo_micro || 0), 0);
    const totalMacroAutorizado = recetasActivas.reduce((sum, r) => sum + (r.total_macro_autorizado || 0), 0);
    const totalMacroSaldo = recetasActivas.reduce((sum, r) => sum + (r.saldo_macro || 0), 0);

    const microPct = totalMicroAutorizado > 0 ? Math.round((totalMicroSaldo / totalMicroAutorizado) * 100) : 0;
    const macroPct = totalMacroAutorizado > 0 ? Math.round((totalMacroSaldo / totalMacroAutorizado) * 100) : 0;

    return (
      <div className={styles.recetaBanner} onClick={() => navigate('/store/recetas')}>
        <div className={styles.recetaBannerContent}>
          <Prescription size={24} weight="bold" className={styles.recetaBannerIcon} />
          <div style={{ flex: 1 }}>
            <p className={styles.recetaBannerTitle}>{recetasActivas.length > 1 ? 'Mis Recetas' : 'Mi Receta'}</p>
            {totalMicroAutorizado > 0 && (
              <div className={styles.miniSaldoRow}>
                <span className={styles.miniSaldoLabel}>Micro</span>
                <div className={styles.miniSaldoBar}>
                  <div className={styles.miniSaldoFill} style={{ width: `${microPct}%`, background: microPct > 20 ? 'var(--color-success)' : 'var(--color-danger)' }} />
                </div>
                <span className={styles.miniSaldoCount}>{totalMicroSaldo}/{totalMicroAutorizado}</span>
              </div>
            )}
            {totalMacroAutorizado > 0 && (
              <div className={styles.miniSaldoRow}>
                <span className={styles.miniSaldoLabel}>Macro</span>
                <div className={styles.miniSaldoBar}>
                  <div className={styles.miniSaldoFill} style={{ width: `${macroPct}%`, background: macroPct > 20 ? 'var(--color-success)' : 'var(--color-danger)' }} />
                </div>
                <span className={styles.miniSaldoCount}>{totalMacroSaldo}/{totalMacroAutorizado}</span>
              </div>
            )}
          </div>
        </div>
        <button className={styles.recetaNewOrderBtn} onClick={(e) => { e.stopPropagation(); navigate('/store/solicitud'); }}>
          <Plus size={14} weight="bold" /> Pedir
        </button>
      </div>
    );
  };

  // Solicitudes with draft orders (approved, pending payment)
  const draftOrders = solicitudes.filter(s =>
    s.estado === 'aprobado' && s.draft_order_url
  );

  const renderDraftOrderCard = (sol: Solicitud) => {
    const items = sol.cart_json || [];
    const firstItem = items[0];
    const moreCount = items.length - 1;

    return (
      <div key={sol.id} className={styles.draftOrderCard}>
        <div className={styles.draftOrderHeader}>
          <div className={styles.orderInfo}>
            <span className={styles.orderName}>{sol.submission_id}</span>
            <span className={styles.orderDate}>{formatDate(sol.created_at)}</span>
          </div>
          <div className={styles.orderRight}>
            <span className={styles.orderTotal}>{formatCLP(sol.total_estimado)}</span>
            <span className={`${styles.statusBadge} ${styles.statusPendingPayment}`}>Suscripción pendiente</span>
          </div>
        </div>

        <div className={styles.draftOrderItems}>
          {items.map((item: any, i: number) => (
            <span key={i} className={styles.draftItemLabel}>{item.displayLabel}</span>
          ))}
        </div>

        <a
          href={sol.draft_order_url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.paymentButton}
          onClick={(e) => e.stopPropagation()}
        >
          <CreditCard size={16} weight="bold" /> Ir al pago
        </a>
      </div>
    );
  };

  const renderOrderCard = (order: ShopifyOrder) => {
    const isExpanded = expandedOrder === order.id;
    const fulfillmentStatus = getStatusLabel(order.fulfillmentStatus || 'UNFULFILLED');
    const latestFulfillment = order.fulfillments?.nodes?.[0];
    const shipmentStatus = latestFulfillment?.latestShipmentStatus;
    const tracking = latestFulfillment?.trackingInformation?.[0];

    return (
      <div key={order.id} className={styles.orderCard} onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
        <div className={styles.orderHeader}>
          <div className={styles.orderInfo}>
            <span className={styles.orderName}>{order.name}</span>
            <span className={styles.orderDate}>{formatDate(order.createdAt)}</span>
          </div>
          <div className={styles.orderRight}>
            <span className={styles.orderTotal}>
              {formatPrice(order.totalPrice.amount, order.totalPrice.currencyCode)}
            </span>
            <span className={`${styles.statusBadge} ${fulfillmentStatus.className}`}>
              {fulfillmentStatus.text}
            </span>
          </div>
        </div>

        {shipmentStatus && (
          <div className={styles.trackingBar}>
            <Truck size={16} weight="bold" />
            <span>{getStatusLabel(shipmentStatus).text}</span>
            {latestFulfillment?.estimatedDeliveryAt && (
              <span className={styles.deliveryDate}>
                Estimado: {formatDate(latestFulfillment.estimatedDeliveryAt)}
              </span>
            )}
            {tracking?.url && (
              <a href={tracking.url} target="_blank" rel="noopener noreferrer" className={styles.trackingLink} onClick={(e) => e.stopPropagation()}>
                Rastrear
              </a>
            )}
          </div>
        )}

        {isExpanded && (
          <div className={styles.lineItems}>
            {order.lineItems.nodes.map((item, i) => (
              <div key={i} className={styles.lineItem}>
                {item.image?.url ? (
                  <img src={item.image.url} alt={item.image.altText || item.name} className={styles.lineItemImage} />
                ) : (
                  <div className={styles.lineItemImagePlaceholder}>
                    <ShoppingBag size={20} weight="light" />
                  </div>
                )}
                <div className={styles.lineItemInfo}>
                  <span className={styles.lineItemName}>{item.name}</span>
                  {item.variantTitle && <span className={styles.lineItemVariant}>{item.variantTitle}</span>}
                  <span className={styles.lineItemQty}>Cantidad: {item.quantity}</span>
                </div>
                <span className={styles.lineItemPrice}>
                  {formatPrice(item.currentTotalPrice.amount, item.currentTotalPrice.currencyCode)}
                </span>
              </div>
            ))}

            <div className={styles.orderSummary}>
              {order.subtotal && (
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal.amount, order.subtotal.currencyCode)}</span>
                </div>
              )}
              {order.totalShipping && parseFloat(order.totalShipping.amount) > 0 && (
                <div className={styles.summaryRow}>
                  <span>Envio</span>
                  <span>{formatPrice(order.totalShipping.amount, order.totalShipping.currencyCode)}</span>
                </div>
              )}
              {order.totalTax && parseFloat(order.totalTax.amount) > 0 && (
                <div className={styles.summaryRow}>
                  <span>Impuestos</span>
                  <span>{formatPrice(order.totalTax.amount, order.totalTax.currencyCode)}</span>
                </div>
              )}
              {order.subtotal && (() => {
                const sub = parseFloat(order.subtotal.amount);
                const ship = parseFloat(order.totalShipping?.amount || '0');
                const tax = parseFloat(order.totalTax?.amount || '0');
                const total = parseFloat(order.totalPrice.amount);
                const discount = sub + ship + tax - total;
                return discount > 0.01 ? (
                  <div className={styles.summaryRow}>
                    <Tag size={14} weight="bold" />
                    <span className={styles.discountLabel}>Descuento</span>
                    <span className={styles.discountAmount}>
                      -{formatPrice(String(discount.toFixed(2)), order.totalPrice.currencyCode)}
                    </span>
                  </div>
                ) : null;
              })()}
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span>Total</span>
                <span>{formatPrice(order.totalPrice.amount, order.totalPrice.currencyCode)}</span>
              </div>
            </div>

            {order.financialStatus && (
              <div className={styles.detailRow}>
                <CurrencyDollar size={16} weight="bold" />
                <span>Pago: </span>
                <span className={`${styles.statusBadge} ${getStatusLabel(order.financialStatus).className}`}>
                  {getStatusLabel(order.financialStatus).text}
                </span>
              </div>
            )}

            {order.shippingAddress && (
              <div className={styles.shippingSection}>
                <div className={styles.shippingSectionTitle}>
                  <MapPin size={16} weight="bold" />
                  <span>Direccion de envio</span>
                </div>
                <div className={styles.shippingAddress}>
                  {order.shippingAddress.firstName && (
                    <span>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</span>
                  )}
                  {order.shippingAddress.address1 && <span>{order.shippingAddress.address1}</span>}
                  {order.shippingAddress.address2 && <span>{order.shippingAddress.address2}</span>}
                  <span>
                    {[order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.zip]
                      .filter(Boolean).join(', ')}
                  </span>
                  {order.shippingAddress.country && <span>{order.shippingAddress.country}</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSubscriptionCard = (sub: ShopifySubscription) => {
    const statusInfo = getStatusLabel(sub.status);
    return (
      <div key={sub.id} className={styles.subscriptionCard}>
        <div className={styles.subHeader}>
          <ArrowsClockwise size={20} weight="bold" className={styles.subIcon} />
          <span className={`${styles.statusBadge} ${statusInfo.className}`}>{statusInfo.text}</span>
        </div>
        {sub.lines.nodes.map((line, i) => (
          <div key={i} className={styles.subLine}>
            {line.variantImage?.url ? (
              <img src={line.variantImage.url} alt={line.variantImage.altText || line.name} className={styles.lineItemImage} />
            ) : (
              <div className={styles.lineItemImagePlaceholder}>
                <Package size={20} weight="light" />
              </div>
            )}
            <div className={styles.lineItemInfo}>
              <span className={styles.lineItemName}>{line.name}</span>
              <span className={styles.lineItemQty}>Cantidad: {line.quantity}</span>
            </div>
            <span className={styles.lineItemPrice}>
              {formatPrice(line.currentPrice.amount, line.currentPrice.currencyCode)}
            </span>
          </div>
        ))}
        {sub.nextBillingDate && (
          <div className={styles.nextBilling}>
            <Receipt size={16} weight="bold" />
            <span>Proximo cobro: {formatDate(sub.nextBillingDate)}</span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.store}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 className={styles.title}>C&D</h1>
          <div style={{ width: 36 }} />
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  const orders = storeData?.orders || [];
  const subscriptions = storeData?.subscriptions || [];

  // Membership gate: block store if membership is not active
  const isExpired = membershipStatus === 'expired';
  const daysExpired = membershipExpires
    ? Math.floor((Date.now() - new Date(membershipExpires).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const blockStore = membershipStatus !== 'active' && !(isExpired && daysExpired < 5);
  const showWarning = isExpired && daysExpired < 5 && daysExpired >= 0;

  const handleSubscribe = async (gateway: string = 'mercadopago') => {
    setSubscribing(true);
    try {
      const data = await subscribeMutation.mutateAsync(gateway);
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data?.subscriptionCreated) {
        // Reactivación directa (tarjeta ya registrada en Flow)
        setSubscriptionProcessing(true);
      } else if (data?.status === 'subscription_active') {
        toast.success(data.message || 'Tu suscripción sigue activa. Los cobros se procesan automáticamente.');
      } else {
        toast.error('No se pudo obtener el enlace de pago');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear suscripción';
      toast.error(message);
    } finally {
      setSubscribing(false);
    }
  };

  // Show processing page when subscription was just created (waiting for webhook)
  if (subscriptionProcessing && membershipStatus !== 'active') {
    return (
      <div className={styles.store}>
        <div className={styles.membershipGate}>
          <CheckCircle size={48} weight="light" style={{ color: '#4CAF50', opacity: 0.8 }} />
          <h2 style={{ fontSize: '18px', color: '#333', margin: '16px 0 8px' }}>
            Suscripción procesada
          </h2>
          <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>
            Tu suscripción fue creada exitosamente. Estamos verificando tu pago.
          </p>
          <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>
            Recibirás un correo con la confirmación y un enlace para acceder a DromeApp.
          </p>
        </div>
        <BottomNav activePage="store" />
      </div>
    );
  }

  if (blockStore && membershipStatus !== 'active') {
    return (
      <div className={styles.store}>
        <div className={styles.membershipGate}>
          <ShoppingBag size={48} weight="light" style={{ color: '#A68050', opacity: 0.5 }} />
          <h2 style={{ fontSize: '18px', color: '#333', margin: '16px 0 8px' }}>
            {membershipStatus === 'pending_payment' ? 'Suscripción pendiente' :
             membershipStatus === 'expired' ? 'Tu membresía ha expirado' :
             'Membresía requerida'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>
            {membershipStatus === 'pending_payment'
              ? 'Tu inscripción fue aprobada. Activa tu suscripción para acceder al dispensario.'
              : membershipStatus === 'expired'
              ? 'Renueva tu membresía para volver a acceder al dispensario.'
              : 'Necesitas una membresía activa para acceder al dispensario. Si aún no te has inscrito, hazlo desde la página de inicio.'}
          </p>
          {(membershipStatus === 'pending_payment' || membershipStatus === 'expired') && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px' }}>
              <button
                onClick={() => handleSubscribe('flow')}
                disabled={subscribing}
                style={{
                  padding: '14px 24px',
                  backgroundColor: '#A68050',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: subscribing ? 'not-allowed' : 'pointer',
                  opacity: subscribing ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <CreditCard size={20} weight="bold" />
                {subscribing ? 'Redirigiendo...' : 'Activar membresía'}
              </button>
              {/* MercadoPago desactivado — solo Flow por ahora */}
            </div>
          )}
        </div>
        <BottomNav activePage="store" />
      </div>
    );
  }

  return (
    <div className={styles.store}>
      {showWarning && (
        <div style={{
          background: '#FFF3E0',
          border: '1px solid #FFE082',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#E65100',
          fontWeight: 500
        }}>
          Tu membresia vence pronto. Renuevala para mantener acceso al dispensario.
        </div>
      )}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 className={styles.title}>C&D</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Receta banner */}
      {renderRecetaBanner()}

      {/* Tab toggle */}
      <div className={styles.tabToggle}>
        <button
          className={`${styles.tabButton} ${activeTab === 'orders' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <span className={styles.tabIcon}><Package size={16} weight="bold" /></span>
          Pedidos
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'solicitudes' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('solicitudes')}
        >
          <span className={styles.tabIcon}><ClipboardText size={16} weight="bold" /></span>
          Solicitudes
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'subscriptions' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('subscriptions')}
        >
          <span className={styles.tabIcon}><ArrowsClockwise size={16} weight="bold" /></span>
          Suscripciones
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'recetas' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('recetas')}
        >
          <span className={styles.tabIcon}><Prescription size={16} weight="bold" /></span>
          Recetas
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'orders' && (
          draftOrders.length === 0 && orders.length === 0 ? (
            <div className={styles.emptyState}>
              <Package size={48} weight="light" />
              <p>No hay pedidos aun</p>
              <p className={styles.emptySubtext}>Tus compras apareceran aqui</p>
            </div>
          ) : (
            <div className={styles.orderList}>
              {draftOrders.map(sol => renderDraftOrderCard(sol))}
              {orders.map(order => renderOrderCard(order))}
            </div>
          )
        )}

        {activeTab === 'solicitudes' && (
          <div className={styles.orderList}>
            {solicitudes.length === 0 ? (
              <div className={styles.emptyState}>
                <ClipboardText size={48} weight="light" />
                <p>No hay solicitudes aun</p>
                <p className={styles.emptySubtext}>Crea tu primer pedido con receta</p>
              </div>
            ) : (
              solicitudes.map(sol => {
                const items = sol.cart_json || [];
                const isReceta = sol.tipo === 'receta';
                const statusMap: Record<string, { text: string; cls: string }> = {
                  pendiente: { text: 'Pendiente', cls: styles.statusPending },
                  pre_aprobado: { text: 'Pre-aprobado', cls: styles.statusInTransit },
                  aprobado: { text: 'Aprobado', cls: styles.statusFulfilled },
                  rechazado: { text: 'Rechazado', cls: styles.statusCancelled },
                  cancelado: { text: 'Cancelado', cls: styles.statusCancelled },
                  pagado: { text: 'Pagado', cls: styles.statusPaid },
                  despachado: { text: 'Despachado', cls: styles.statusInTransit },
                  entregado: { text: 'Entregado', cls: styles.statusFulfilled }
                };
                const status = statusMap[sol.estado] || { text: sol.estado, cls: '' };

                return (
                  <div key={sol.id} className={styles.orderCard} onClick={() => navigate(`/store/solicitudes/${sol.id}`)}>
                    <div className={styles.orderHeader}>
                      <div className={styles.orderInfo}>
                        <span className={styles.orderName}>{sol.submission_id}</span>
                        <span className={styles.orderDate}>{formatDate(sol.created_at)}</span>
                      </div>
                      <div className={styles.orderRight}>
                        {!isReceta && <span className={styles.orderTotal}>{formatCLP(sol.total_estimado)}</span>}
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <span className={`${styles.statusBadge} ${isReceta ? styles.tipoBadgeReceta : styles.tipoBadgeDispensacion}`}>
                            {isReceta ? 'Receta' : 'Dispensación'}
                          </span>
                          <span className={`${styles.statusBadge} ${status.cls}`}>{status.text}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {isReceta ? (
                        <span>Solicitud de receta</span>
                      ) : (
                        items.map((item: any, i: number) => (
                          <span key={i}>{item.displayLabel}</span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <>
            {/* Membresía C&D */}
            {membershipStatus === 'active' && (
              <div className={styles.membershipCard}>
                <div className={styles.membershipHeader}>
                  <CheckCircle size={20} weight="fill" color="#2E7D32" />
                  <span className={styles.membershipTitle}>Membresía C&D</span>
                  <span className={styles.membershipBadge}>Activa</span>
                </div>
                {membershipExpires && (
                  <p className={styles.membershipDetail}>
                    Vence: <strong>{new Date(membershipExpires).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </p>
                )}
                <p className={styles.membershipDetail}>Facturación mensual automática vía Flow.cl</p>
              </div>
            )}

            {subscriptions.length === 0 && membershipStatus !== 'active' ? (
              <div className={styles.emptyState}>
                <ArrowsClockwise size={48} weight="light" />
                <p>No hay suscripciones activas</p>
                <p className={styles.emptySubtext}>Tus suscripciones apareceran aqui</p>
              </div>
            ) : subscriptions.length > 0 ? (
              <div className={styles.subscriptionList}>
                {subscriptions.map(sub => renderSubscriptionCard(sub))}
              </div>
            ) : null}
          </>
        )}

        {activeTab === 'recetas' && (
          <div>
            {/* Boton subir/actualizar receta */}
            <div className={styles.recetaUploadBanner} onClick={() => navigate('/store/recetas')}>
              <Plus size={18} weight="bold" />
              <span>Subir o actualizar receta</span>
            </div>

            {recetasActivas.length > 0 ? (
              recetasActivas.map(receta => {
                const isRecetaExpanded = expandedRecetaId === receta.id;
                return (
                  <div key={receta.id} className={styles.recetaDetailCard} style={{ marginBottom: 12 }}>
                    <div className={styles.recetaCardHeader} onClick={() => setExpandedRecetaId(isRecetaExpanded ? null : receta.id)}>
                      <Prescription size={24} weight="duotone" />
                      <h3>Receta Activa{receta.medico_nombre ? ` — ${receta.medico_nombre}` : ''}</h3>
                      {isRecetaExpanded ? <CaretUp size={16} weight="bold" style={{ color: '#999', marginLeft: 'auto' }} /> : <CaretDown size={16} weight="bold" style={{ color: '#999', marginLeft: 'auto' }} />}
                    </div>

                    {receta.total_micro_autorizado > 0 && (
                      <div className={styles.recetaSaldoRow}>
                        <div className={styles.recetaSaldoLabel}>
                          <span>Microdosis</span>
                          {receta.gramaje_micro && <span className={styles.recetaGramaje}>{receta.gramaje_micro}</span>}
                        </div>
                        <div className={styles.recetaSaldoBar}>
                          <div
                            className={styles.recetaSaldoFill}
                            style={{
                              width: `${Math.round((receta.saldo_micro / receta.total_micro_autorizado) * 100)}%`,
                              background: receta.saldo_micro > receta.total_micro_autorizado * 0.2 ? 'var(--color-success)' : 'var(--color-danger)'
                            }}
                          />
                        </div>
                        <span className={styles.recetaSaldoCount}>
                          {receta.saldo_micro}/{receta.total_micro_autorizado} caps
                        </span>
                      </div>
                    )}

                    {receta.total_macro_autorizado > 0 && (
                      <div className={styles.recetaSaldoRow}>
                        <div className={styles.recetaSaldoLabel}>
                          <span>Macrodosis</span>
                          {receta.gramaje_macro && <span className={styles.recetaGramaje}>{receta.gramaje_macro}</span>}
                        </div>
                        <div className={styles.recetaSaldoBar}>
                          <div
                            className={styles.recetaSaldoFill}
                            style={{
                              width: `${Math.round((receta.saldo_macro / receta.total_macro_autorizado) * 100)}%`,
                              background: receta.saldo_macro > receta.total_macro_autorizado * 0.2 ? 'var(--color-success)' : 'var(--color-danger)'
                            }}
                          />
                        </div>
                        <span className={styles.recetaSaldoCount}>
                          {receta.saldo_macro}/{receta.total_macro_autorizado}
                        </span>
                      </div>
                    )}

                    {isRecetaExpanded && (
                      <div className={styles.recetaMetaGrid}>
                        {receta.paciente_nombre && (
                          <div className={styles.recetaMetaItem}>
                            <span className={styles.recetaMetaLabel}>Paciente</span>
                            <span className={styles.recetaMetaValue}>{receta.paciente_nombre}</span>
                          </div>
                        )}
                        {receta.fecha_emision && (
                          <div className={styles.recetaMetaItem}>
                            <span className={styles.recetaMetaLabel}>Emitida</span>
                            <span className={styles.recetaMetaValue}>{formatDate(receta.fecha_emision)}</span>
                          </div>
                        )}
                        {receta.fecha_vencimiento && (
                          <div className={styles.recetaMetaItem}>
                            <span className={styles.recetaMetaLabel}>Vencimiento</span>
                            <span className={styles.recetaMetaValue}>{formatDate(receta.fecha_vencimiento)}</span>
                          </div>
                        )}
                        {receta.protocolo && (
                          <div className={styles.recetaMetaItem}>
                            <span className={styles.recetaMetaLabel}>Protocolo</span>
                            <span className={styles.recetaMetaValue}>{receta.protocolo}</span>
                          </div>
                        )}
                        {receta.duracion && (
                          <div className={styles.recetaMetaItem}>
                            <span className={styles.recetaMetaLabel}>Duracion</span>
                            <span className={styles.recetaMetaValue}>{receta.duracion}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyState}>
                <Prescription size={48} weight="light" />
                <p>No hay receta activa</p>
                <p className={styles.emptySubtext}>Sube una receta desde "Mis Recetas" o al hacer un pedido</p>
              </div>
            )}

            {recetasActivas.length > 0 && (
              <button className={styles.recetaOrderBtn} onClick={() => navigate('/store/solicitud')} style={{ margin: '0 0 12px' }}>
                <Plus size={16} weight="bold" /> Hacer nuevo pedido
              </button>
            )}

            {/* Recetas pasadas */}
            {recetasPasadas.length > 0 && (
              <div className={styles.recetasPasadasSection}>
                <h4 className={styles.recetasPasadasTitle}>Recetas anteriores</h4>
                {recetasPasadas.map(r => (
                  <div key={r.id} className={styles.recetaPasadaCard} onClick={() => navigate('/store/recetas')}>
                    <div className={styles.recetaPasadaHeader}>
                      <span className={styles.recetaPasadaDoctor}>{r.medico_nombre || 'Medico no registrado'}</span>
                      <span className={`${styles.recetaPasadaEstado} ${
                        r.estado === 'completada' ? styles.recetaPasadaCompletada :
                        r.estado === 'vencida' ? styles.recetaPasadaVencida :
                        styles.recetaPasadaCancelada
                      }`}>
                        {r.estado === 'completada' ? 'Completada' : r.estado === 'vencida' ? 'Vencida' : r.estado === 'reemplazada' ? 'Reemplazada' : 'Cancelada'}
                      </span>
                    </div>
                    <div className={styles.recetaPasadaMeta}>
                      {r.fecha_emision && <span>Emitida: {formatDate(r.fecha_emision)}</span>}
                      {r.total_micro_autorizado > 0 && <span>Micro: {r.saldo_micro}/{r.total_micro_autorizado}</span>}
                      {r.total_macro_autorizado > 0 && <span>Macro: {r.saldo_macro}/{r.total_macro_autorizado}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav activePage="store" />
    </div>
  );
};

export default ShopifyStore;
