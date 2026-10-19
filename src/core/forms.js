'use strict';
// Form-field mapping from user-supplied facts to detected fields. Never invents values.

const SYNONYMS = {
  firstName: ['first name', 'given name', 'forename'],
  lastName: ['last name', 'surname', 'family name'],
  fullName: ['full name', 'name', 'your name'],
  email: ['email', 'e-mail', 'email address'],
  phone: ['phone', 'mobile', 'telephone', 'contact number'],
  dob: ['date of birth', 'dob', 'birth date', 'birthday'],
  address: ['address', 'street'],
  city: ['city', 'town'],
  postalCode: ['zip', 'postal', 'postcode', 'pin code'],
  country: ['country'],
  username: ['username', 'user name', 'login'],
  company: ['company', 'organization', 'organisation', 'employer'],
};
const SENSITIVE_FIELD = /password|passcode|otp|verification code|card|cvv|cvc|ssn|social security|passport|aadhaar|pan\b|iban|routing/i;
const norm = (s) => String(s || '').toLowerCase().replace(/[*:]/g, '').replace(/\s+/g, ' ').trim();

function keyForLabel(label) {
  const l = norm(label);
  let best = null;
  let bestLen = 0;
  for (const [key, syns] of Object.entries(SYNONYMS)) {
    for (const s of syns) {
      const hit = l === s || new RegExp(`(^|\\b)${s}(\\b|$)`).test(l);
      if (hit && s.length > bestLen) { best = key; bestLen = s.length; }
    }
  }
  return best;
}

const VALIDATORS = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),
  phone: (v) => v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15,
  dob: (v) => !Number.isNaN(Date.parse(v)) && new Date(v) < new Date(),
  postalCode: (v) => /^[A-Za-z0-9 -]{3,10}$/.test(v),
};

/**
 * @param fields [{id,label,type,required}]  @param facts {email:'..',...} (user-provided only)
 * @returns {plan:[{id,label,value,status}], missing:[], sensitive:[], invalid:[]}
 * status: 'fill' | 'missing' | 'sensitive-user-only' | 'invalid'
 */
function mapFields(fields, facts) {
  const plan = [];
  for (const f of fields) {
    const label = f.label || '';
    if (SENSITIVE_FIELD.test(label) || f.type === 'password') {
      plan.push({ id: f.id, label, status: 'sensitive-user-only', required: !!f.required });
      continue;
    }
    let key = keyForLabel(label);
    if (key === 'fullName' && !facts.fullName && facts.firstName && facts.lastName) {
      plan.push({ id: f.id, label, value: `${facts.firstName} ${facts.lastName}`, status: 'fill', required: !!f.required });
      continue;
    }
    const value = key ? facts[key] : undefined;
    if (value == null || value === '') {
      plan.push({ id: f.id, label, status: 'missing', required: !!f.required });
      continue;
    }
    const v = VALIDATORS[key];
    if (v && !v(String(value))) plan.push({ id: f.id, label, value, status: 'invalid', required: !!f.required });
    else plan.push({ id: f.id, label, value, status: 'fill', required: !!f.required });
  }
  return {
    plan,
    missing: plan.filter((p) => p.status === 'missing' && p.required).map((p) => p.label),
    sensitive: plan.filter((p) => p.status === 'sensitive-user-only').map((p) => p.label),
    invalid: plan.filter((p) => p.status === 'invalid').map((p) => p.label),
  };
}

/** Review summary shown before the final submit. Sensitive values are masked. */
function reviewSummary(plan) {
  return plan.filter((p) => p.status === 'fill').map((p) => ({ label: p.label, value: p.value }));
}

module.exports = { mapFields, reviewSummary, keyForLabel, SENSITIVE_FIELD };
