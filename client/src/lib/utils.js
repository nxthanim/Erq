/**
 * Utility to merge class names. Filters out falsy values.
 * @param  {...(string|boolean|undefined|null)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Opens Chapa checkout in a new tab using the fields returned by the backend
 * (initiateChapa). The public key comes from the server — nothing is
 * hardcoded client-side. POSTs directly to Chapa's hosted payment endpoint.
 *
 * @param {Object} fields - Response from initiateChapa API
 * @returns {boolean} - Whether Chapa was opened successfully
 */
export function openChapaCheckout(fields) {
  if (!fields?.tx_ref) {
    console.error('openChapaCheckout: Missing tx_ref');
    return false;
  }

  // Build a hidden form that POSTs to Chapa's hosted pay endpoint
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://api.chapa.co/v1/hosted/pay';
  form.target = '_blank'; // Open in new tab
  form.style.display = 'none';

  const formData = {
    public_key: fields.public_key || '',
    tx_ref: fields.tx_ref,
    amount: fields.amount || '0',
    currency: fields.currency || 'ETB',
    email: fields.email || '',
    first_name: fields.first_name || 'Customer',
    last_name: fields.last_name || 'User',
    title: fields.title || 'Erq Marketplace Payment',
    description: fields.description || 'Payment via Erq Marketplace',
    logo: 'https://chapa.link/asset/images/chapa_swirl.svg',
    callback_url: fields.callback_url || '',
    return_url: fields.return_url || '',
    'meta[title]': 'Erq Marketplace Payment',
  };

  Object.entries(formData).forEach(([name, value]) => {
    if (value) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
  });

  document.body.appendChild(form);
  form.submit();
  return true;
}

/**
 * @deprecated Use openChapaCheckout instead
 */
export function submitChapaForm(fields) {
  return openChapaCheckout(fields);
}
