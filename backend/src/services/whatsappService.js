'use strict';

const env = require('../config/env');

function generateRsvpWhatsappLink(whatsappNumber, rsvpToken, coupleName) {
  if (!isValidPlanningWhatsappNumber(whatsappNumber)) {
    throw new Error('Invalid WhatsApp number');
  }

  const normalized = normalizeIsraeliPhone(whatsappNumber);
  const rsvpUrl = `${env.FRONTEND_URL}/rsvp/${rsvpToken}`;

  const message =
    `שלום! 💌\n` +
    `אנו שמחים להזמין אתכם לחגוג איתנו את החתונה של ${coupleName}.\n` +
    `אנא אשרו הגעה דרך הקישור הבא:\n` +
    rsvpUrl;

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function normalizeIsraeliPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  if (digits.length === 9) return `972${digits}`;
  return digits;
}

function isValidPlanningWhatsappNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 9;
}

module.exports = { generateRsvpWhatsappLink, normalizeIsraeliPhone, isValidPlanningWhatsappNumber };
