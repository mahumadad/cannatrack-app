import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from './Toast';
import { Package, Truck, ArrowsClockwise, Receipt, ShoppingBag, ArrowLeft, MapPin, Tag, CurrencyDollar, Prescription, ClipboardText, Plus, CreditCard } from '@phosphor-icons/react';
import styles from './ShopifyStore.module.css';
import { useUser } from '../hooks/useUser';
import type { ShopifyOrder, ShopifySubscription, ShopifyStoreData, Receta, Solicitud } from '../types';

type Tab = 'orders' | 'subscriptions' | 'solicitudes' | 'recetas';

const ShopifyStore: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useUser();
  const [storeData, setStoreData] = useState<ShopifyStoreData | null>(null);
  const [recetaActiva, setRecetaActiva] = useState<Receta | null>(null);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadStoreData(user.id);
      loadRecetaActiva(user.id);
      loadSolicitudes(user.id);
    }
  }, [user]);

  const loadStoreData = async (userId: string) => {
    setLoading(true);
    try {
      const data = await api.get(`/api/shopify/store/${userId}`, { skipAuthRedirect: true });
      setStoreData(data);
    } catch {
      // Silencioso — el usuario puede no tener Shopify conectado
    } finally {
      setLoading(false);
    }
  };

  const loadRecetaActiva = async (userId: string) => {
    try {
      const data = await api.get(`/api/recetas/${userId}`);
      const activa = data?.find((r: Receta) => r.estado === 'activa');
      setRecetaActiva(activa || null);
    } catch {
      // Silencioso — la receta es opcional
    }
  };

  const loadSolicitudes = async (userId: string) => {
    try {
      const data = await api.get(`/api/solicitudes/${userId}`);
      setSolicitudes(data || []);
    } catch {
      // Silencioso
    }
  };

  const formatCLP = (n: number): string =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

  const formatPrice = (amount: string, currency: string): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency || 'MXN'
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
    if (!recetaActiva) {
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

    const microPct = recetaActiva.total_micro_autorizado > 0
      ? Math.round((recetaActiva.saldo_micro / recetaActiva.total_micro_autorizado) * 100)
      : 0;
    const macroPct = recetaActiva.total_macro_autorizado > 0
      ? Math.round((recetaActiva.saldo_macro / recetaActiva.total_macro_autorizado) * 100)
      : 0;

    return (
      <div className={styles.recetaBanner} onClick={() => navigate('/store/recetas')}>
        <div className={styles.recetaBannerContent}>
          <Prescription size={24} weight="bold" className={styles.recetaBannerIcon} />
          <div style={{ flex: 1 }}>
            <p className={styles.recetaBannerTitle}>Mi Receta</p>
            {recetaActiva.total_micro_autorizado > 0 && (
              <div className={styles.miniSaldoRow}>
                <span className={styles.miniSaldoLabel}>Micro</span>
                <div className={styles.miniSaldoBar}>
                  <div className={styles.miniSaldoFill} style={{ width: `${microPct}%`, background: microPct > 20 ? 'var(--color-success)' : 'var(--color-danger)' }} />
                </div>
                <span className={styles.miniSaldoCount}>{recetaActiva.saldo_micro}/{recetaActiva.total_micro_autorizado}</span>
              </div>
            )}
            {recetaActiva.total_macro_autorizado > 0 && (
              <div className={styles.miniSaldoRow}>
                <span className={styles.miniSaldoLabel}>Macro</span>
                <div className={styles.miniSaldoBar}>
                  <div className={styles.miniSaldoFill} style={{ width: `${macroPct}%`, background: macroPct > 20 ? 'var(--color-success)' : 'var(--color-danger)' }} />
                </div>
                <span className={styles.miniSaldoCount}>{recetaActiva.saldo_macro}/{recetaActiva.total_macro_autorizado}</span>
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
            <span className={`${styles.statusBadge} ${styles.statusPendingPayment}`}>Pago pendiente</span>
          </div>
        </div>

        <div className={styles.draftOrderItems}>
          {firstItem && (
            <span className={styles.draftItemLabel}>{firstItem.displayLabel}</span>
          )}
          {moreCount > 0 && (
            <span className={styles.draftItemMore}>+{moreCount} más</span>
          )}
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
          <button className={styles.backButton} onClick={() => navigate('/dashboard')}>
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

  return (
    <div className={styles.store}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/dashboard')}>
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
          <Package size={16} weight="bold" />
          Pedidos
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'solicitudes' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('solicitudes')}
        >
          <ClipboardText size={16} weight="bold" />
          Solicitudes
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'subscriptions' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('subscriptions')}
        >
          <ArrowsClockwise size={16} weight="bold" />
          Suscripciones
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
          <div style={{ paddingTop: 8 }}>
            <button
              className={styles.tabButton}
              style={{ width: '100%', padding: 14, background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', justifyContent: 'center', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}
              onClick={() => navigate('/store/solicitudes')}
            >
              <ClipboardText size={18} weight="bold" />
              Ver todas mis solicitudes
            </button>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          subscriptions.length === 0 ? (
            <div className={styles.emptyState}>
              <ArrowsClockwise size={48} weight="light" />
              <p>No hay suscripciones activas</p>
              <p className={styles.emptySubtext}>Tus suscripciones apareceran aqui</p>
            </div>
          ) : (
            <div className={styles.subscriptionList}>
              {subscriptions.map(sub => renderSubscriptionCard(sub))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ShopifyStore;
