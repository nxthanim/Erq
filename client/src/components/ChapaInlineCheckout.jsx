import { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck, CheckCircle } from 'lucide-react';

/**
 * Chapa Inline Checkout — Embedded payment widget that keeps users on the page.
 * No redirect, no new tab, no popup blockers. User selects payment method,
 * enters phone number, and pays directly on the page.
 *
 * Requires: <script src="https://js.chapa.co/v1/inline.js"></script> in index.html
 * (provided by the CDN, which sets window.ChapaCheckout)
 *
 * Props:
 *   publicKey, txRef, amount, currency (default 'ETB')
 *   onSuccess(payload, refId), onFailure(error), onClose()
 *   containerId (default 'chapa-inline-form')
 *   buttonText (optional)
 */
export default function ChapaInlineCheckout({
  publicKey,
  txRef,
  amount,
  currency = 'ETB',
  onSuccess,
  onFailure,
  onClose,
  containerId = 'chapa-inline-form',
  buttonText,
  children,
}) {
  const initialized = useRef(false);
  const containerRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(
    typeof window !== 'undefined' && !!window.ChapaCheckout
  );
  // Use refs for callbacks to avoid re-initialization on every render
  const onSuccessRef = useRef(onSuccess);
  const onFailureRef = useRef(onFailure);
  const onCloseRef = useRef(onClose);
  const buttonTextRef = useRef(buttonText);
  onSuccessRef.current = onSuccess;
  onFailureRef.current = onFailure;
  onCloseRef.current = onClose;
  buttonTextRef.current = buttonText;

  // Poll for the CDN script to load
  useEffect(() => {
    if (scriptReady) return;
    const check = setInterval(() => {
      if (window.ChapaCheckout) {
        setScriptReady(true);
        clearInterval(check);
      }
    }, 300);
    const timeout = setTimeout(() => {
      clearInterval(check);
      console.warn('⏰ ChapaCheckout script did not load within 15 seconds');
    }, 15000);
    return () => {
      clearInterval(check);
      clearTimeout(timeout);
    };
  }, [scriptReady]);

  useEffect(() => {
    if (initialized.current || !publicKey || !txRef || !amount || !scriptReady) return;

    const Chapa = window.ChapaCheckout;
    if (!Chapa) return;

    try {
      const chapa = new Chapa({
        publicKey,
        amount: amount.toString(),
        currency,
        tx_ref: txRef,
        onSuccessfulPayment: (result, refId) => {
          console.log('✅ Chapa inline payment successful:', { result, refId });
          onSuccessRef.current?.(result, refId);
        },
        onPaymentFailure: (error) => {
          console.error('❌ Chapa inline payment failed:', error);
          onFailureRef.current?.(error);
        },
        onClose: () => {
          console.log('🔒 Chapa inline widget closed');
          onCloseRef.current?.();
        },
        customizations: {
          buttonText: buttonTextRef.current || `Pay ETB ${parseFloat(amount || 0).toLocaleString()}`,
          successMessage: 'Payment Successful! 🎉',
        },
        availablePaymentMethods: ['telebirr', 'cbebirr', 'ebirr', 'mpesa', 'chapa'],
        showFlag: true,
        showPaymentMethodsNames: true,
      });

      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
      }
      chapa.initialize(containerId);
      initialized.current = true;
    } catch (err) {
      console.error('❌ Failed to initialize Chapa inline widget:', err);
      onFailureRef.current?.(err);
    }

    return () => {
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = '';
      initialized.current = false;
    };
  }, [publicKey, txRef, amount, currency, containerId, scriptReady]);

  // If no data, render nothing
  if (!publicKey || !txRef || !amount) {
    return null;
  }

  // Script still loading
  if (!scriptReady) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin text-emerald-500 mx-auto mb-2" />
          <p className="text-xs text-gray-400">Loading secure checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Info card */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 text-lg">
            🔒
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">Chapa Secure Checkout</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Pay securely with <strong>Telebirr</strong>, <strong>CBE Birr</strong>,{' '}
              <strong>Ebirr</strong>, <strong>M-Pesa</strong>, or other methods. 
              Enter your phone number and complete the payment — no redirect needed.
            </p>
          </div>
        </div>
      </div>

      {/* Widget container */}
      <div ref={containerRef}>
        <div id={containerId} />
      </div>

      {/* Optional children (e.g., verify button or extra info) */}
      {children}
    </div>
  );
}
