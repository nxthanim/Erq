const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Email Verification Utility
 * 
 * Uses the email verification data model to store and manage email verification results.
 * The verification data structure matches common email verification APIs (AbstractAPI, ZeroBounce, etc.).
 */

// Verification data model
const EMAIL_VERIFICATION_MODEL = {
  email_address: '',
  suggested_correction: null,
  email_deliverability: {
    status: 'pending',
    status_detail: 'pending_verification',
    is_format_valid: false,
    is_smtp_valid: false,
    is_mx_valid: false,
    mx_records: []
  },
  email_sender: {
    first_name: null,
    last_name: null,
    email_provider_name: null,
    organization_name: null,
    organization_type: null
  },
  email_domain: {
    domain: '',
    domain_age: 0,
    is_live_site: false,
    registrar: '',
    registrar_url: null,
    date_registered: '',
    date_last_renewed: '',
    date_expires: '',
    is_risky_tld: false
  },
  email_quality: {
    score: 0,
    is_free_email: false,
    is_username_suspicious: false,
    is_disposable: false,
    is_catchall: false,
    is_subaddress: false,
    is_role: false,
    is_dmarc_enforced: false,
    is_spf_strict: false,
    minimum_age: null
  },
  email_risk: {
    address_risk_status: 'unknown',
    domain_risk_status: 'unknown'
  },
  email_breaches: {
    total_breaches: 0,
    date_first_breached: null,
    date_last_breached: null,
    breached_domains: []
  }
};

/**
 * Parse raw API response into flattened DB format
 */
function parseVerificationData(apiResponse) {
  const d = apiResponse || EMAIL_VERIFICATION_MODEL;
  
  return {
    email_address: d.email_address || '',
    suggested_correction: d.suggested_correction || null,
    status: d.email_deliverability?.status || 'pending',
    status_detail: d.email_deliverability?.status_detail || 'pending_verification',
    is_format_valid: d.email_deliverability?.is_format_valid ? 1 : 0,
    is_smtp_valid: d.email_deliverability?.is_smtp_valid ? 1 : 0,
    is_mx_valid: d.email_deliverability?.is_mx_valid ? 1 : 0,
    mx_records: JSON.stringify(d.email_deliverability?.mx_records || []),
    email_provider_name: d.email_sender?.email_provider_name || null,
    organization_name: d.email_sender?.organization_name || null,
    organization_type: d.email_sender?.organization_type || null,
    domain: d.email_domain?.domain || '',
    domain_age: d.email_domain?.domain_age || 0,
    is_live_site: d.email_domain?.is_live_site ? 1 : 0,
    registrar: d.email_domain?.registrar || '',
    date_registered: d.email_domain?.date_registered || '',
    date_last_renewed: d.email_domain?.date_last_renewed || '',
    date_expires: d.email_domain?.date_expires || '',
    score: d.email_quality?.score || 0,
    is_free_email: d.email_quality?.is_free_email ? 1 : 0,
    is_disposable: d.email_quality?.is_disposable ? 1 : 0,
    is_catchall: d.email_quality?.is_catchall ? 1 : 0,
    is_role: d.email_quality?.is_role ? 1 : 0,
    is_dmarc_enforced: d.email_quality?.is_dmarc_enforced ? 1 : 0,
    is_spf_strict: d.email_quality?.is_spf_strict ? 1 : 0,
    address_risk_status: d.email_risk?.address_risk_status || 'unknown',
    domain_risk_status: d.email_risk?.domain_risk_status || 'unknown',
    total_breaches: d.email_breaches?.total_breaches || 0,
    date_first_breached: d.email_breaches?.date_first_breached || null,
    date_last_breached: d.email_breaches?.date_last_breached || null,
  };
}

/**
 * Store email verification result in database
 * @param {string} email - The email address being verified
 * @param {string|null} userId - The user ID (can be null during pre-signup verification)
 * @param {object} verificationData - The verification API response data
 * @returns {object} The stored verification record
 */
async function storeVerification(email, userId, verificationData) {
  const id = uuidv4();
  const parsed = parseVerificationData(verificationData);

  await db.prepare(`
    INSERT INTO email_verifications (
      id, user_id, email, email_address, suggested_correction,
      status, status_detail, is_format_valid, is_smtp_valid, is_mx_valid, mx_records,
      email_provider_name, organization_name, organization_type,
      domain, domain_age, is_live_site, registrar,
      date_registered, date_last_renewed, date_expires,
      score, is_free_email, is_disposable, is_catchall, is_role,
      is_dmarc_enforced, is_spf_strict,
      address_risk_status, domain_risk_status,
      total_breaches, date_first_breached, date_last_breached
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11,
      $12, $13, $14,
      $15, $16, $17, $18,
      $19, $20, $21,
      $22, $23, $24, $25, $26,
      $27, $28,
      $29, $30,
      $31, $32, $33
    )
  `).run(
    id, userId, email, parsed.email_address, parsed.suggested_correction,
    parsed.status, parsed.status_detail, parsed.is_format_valid, parsed.is_smtp_valid, parsed.is_mx_valid, parsed.mx_records,
    parsed.email_provider_name, parsed.organization_name, parsed.organization_type,
    parsed.domain, parsed.domain_age, parsed.is_live_site, parsed.registrar,
    parsed.date_registered, parsed.date_last_renewed, parsed.date_expires,
    parsed.score, parsed.is_free_email, parsed.is_disposable, parsed.is_catchall, parsed.is_role,
    parsed.is_dmarc_enforced, parsed.is_spf_strict,
    parsed.address_risk_status, parsed.domain_risk_status,
    parsed.total_breaches, parsed.date_first_breached, parsed.date_last_breached
  );

  return getVerificationByEmail(email);
}

/**
 * Get the latest verification for an email
 */
async function getVerificationByEmail(email) {
  return await db.prepare(`
    SELECT * FROM email_verifications 
    WHERE email = $1 
    ORDER BY created_at DESC 
    LIMIT 1
  `).get(email);
}

/**
 * Get verification by ID
 */
async function getVerificationById(id) {
  return await db.prepare('SELECT * FROM email_verifications WHERE id = $1').get(id);
}

/**
 * Check if an email is verified (deliverable with good score)
 */
async function isEmailVerified(email) {
  const verification = await getVerificationByEmail(email);
  if (!verification) return false;
  
  return (
    verification.status === 'deliverable' &&
    verification.score >= 0.7 &&
    verification.is_format_valid === 1 &&
    verification.is_disposable === 0
  );
}

/**
 * Build the full verification JSON response from DB record
 */
function buildVerificationResponse(record) {
  if (!record) return null;
  
  return {
    email_address: record.email_address,
    suggested_correction: record.suggested_correction,
    email_deliverability: {
      status: record.status,
      status_detail: record.status_detail,
      is_format_valid: !!record.is_format_valid,
      is_smtp_valid: !!record.is_smtp_valid,
      is_mx_valid: !!record.is_mx_valid,
      mx_records: JSON.parse(record.mx_records || '[]')
    },
    email_sender: {
      first_name: null,
      last_name: null,
      email_provider_name: record.email_provider_name,
      organization_name: record.organization_name,
      organization_type: record.organization_type
    },
    email_domain: {
      domain: record.domain,
      domain_age: record.domain_age,
      is_live_site: !!record.is_live_site,
      registrar: record.registrar,
      registrar_url: null,
      date_registered: record.date_registered,
      date_last_renewed: record.date_last_renewed,
      date_expires: record.date_expires,
      is_risky_tld: false
    },
    email_quality: {
      score: record.score,
      is_free_email: !!record.is_free_email,
      is_username_suspicious: false,
      is_disposable: !!record.is_disposable,
      is_catchall: !!record.is_catchall,
      is_subaddress: false,
      is_role: !!record.is_role,
      is_dmarc_enforced: !!record.is_dmarc_enforced,
      is_spf_strict: !!record.is_spf_strict,
      minimum_age: null
    },
    email_risk: {
      address_risk_status: record.address_risk_status,
      domain_risk_status: record.domain_risk_status
    },
    email_breaches: {
      total_breaches: record.total_breaches,
      date_first_breached: record.date_first_breached,
      date_last_breached: record.date_last_breached,
      breached_domains: []
    }
  };
}

module.exports = {
  EMAIL_VERIFICATION_MODEL,
  parseVerificationData,
  storeVerification,
  getVerificationByEmail,
  getVerificationById,
  isEmailVerified,
  buildVerificationResponse,
};
