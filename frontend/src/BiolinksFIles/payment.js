// Cashfree Payment Integration Utility

class CashfreePayment {
  constructor() {
    this.isInitialized = false;
    this.cashfree = null;
  }

  // Initialize Cashfree SDK
  async initialize(mode = 'sandbox') {
    try {
      // Load Cashfree SDK if not already loaded
      if (!window.Cashfree) {
        await this.loadCashfreeSDK();
      }

      this.cashfree = new window.Cashfree({
        mode: mode // 'sandbox' or 'production'
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Cashfree:', error);
      return false;
    }
  }

  // Load Cashfree SDK dynamically
  loadCashfreeSDK() {
    return new Promise((resolve, reject) => {
      if (window.Cashfree) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Create payment session
  async createPaymentSession(paymentData) {
    if (!this.isInitialized) {
      throw new Error('Cashfree not initialized');
    }

    try {
      const paymentSession = await this.cashfree.payments.create({
        orderId: paymentData.order_id,
        orderAmount: paymentData.order_amount,
        orderCurrency: paymentData.order_currency,
        customerDetails: paymentData.customer_details,
        orderMeta: paymentData.order_meta
      });

      return paymentSession;
    } catch (error) {
      console.error('Failed to create payment session:', error);
      throw error;
    }
  }

  // Redirect to payment page
  redirectToPayment(paymentSessionId) {
    if (!this.isInitialized) {
      throw new Error('Cashfree not initialized');
    }

    this.cashfree.payments.redirect(paymentSessionId);
  }

  // Handle payment success
  handlePaymentSuccess(callback) {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const orderId = urlParams.get('order_id');

    if (paymentStatus === 'SUCCESS' && orderId) {
      callback({
        status: 'success',
        orderId: orderId,
        paymentId: urlParams.get('payment_id')
      });
    }
  }

  // Handle payment failure
  handlePaymentFailure(callback) {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const orderId = urlParams.get('order_id');

    if (paymentStatus === 'FAILED' && orderId) {
      callback({
        status: 'failed',
        orderId: orderId,
        error: urlParams.get('error_message') || 'Payment failed'
      });
    }
  }
}

// Create global instance
const cashfreePayment = new CashfreePayment();

// Export for use in components
export default cashfreePayment;

// Also make it available globally for backward compatibility
window.cashfreePayment = cashfreePayment;
