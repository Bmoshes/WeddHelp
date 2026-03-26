'use strict';

const XLSX = require('xlsx');
const crypto = require('crypto');
const Invitation = require('../models/Invitation');
const Guest = require('../models/Guest');

const COLUMN_MAP = {
  'שם': 'householdName',
  'שם משפחה': 'lastName',
  'שם פרטי': 'firstName',
  'טלפון': 'whatsappNumber',
  'וואטסאפ': 'whatsappNumber',
  'פלאפון': 'whatsappNumber',
  'נייד': 'whatsappNumber',
  'מס טלפון': 'whatsappNumber',
  'מספר טלפון': 'whatsappNumber',
  'מס טלפון נייד': 'whatsappNumber',
  'מספר פלאפון': 'whatsappNumber',
  'כמות': 'amount',
  'מספר אורחים': 'amount',
  'פלוס כמה': 'amount',
  'פלוס': 'amount',
  '+כמה': 'amount',
  'מספר מלווים': 'amount',
  'צד': 'side',
  'קבוצה': 'group',
  'הערות': 'notes',
  'גיל': 'age',
  'העדפת ארוחה': 'mealPreference',
  'ארוחה': 'mealPreference',
  // Proximity seating columns (optional)
  'קרבה': 'relationshipGroup',
  'קבוצת קרבה': 'relationshipGroup',
  'קבוצת קשר': 'relationshipGroup',
  'קשר': 'relationshipGroup',
  'relationship group': 'relationshipGroup',
  'relationship': 'relationshipGroup',
  'עוצמת קרבה': 'relationshipStrength',
  'קרבה בספרות': 'relationshipStrength',
  'relationship strength': 'relationshipStrength',
};

const SIDE_PARSE = {
  'חתן': 'groom',
  'groom': 'groom',
  'כלה': 'bride',
  'bride': 'bride',
  'שניהם': 'mutual',
  'mutual': 'mutual',
  'שני הצדדים': 'mutual',
};

const GROUP_PARSE = {
  'משפחה': 'family',
  'family': 'family',
  'חברים': 'friends',
  'friends': 'friends',
  'עבודה': 'work',
  'work': 'work',
};

const MEAL_PARSE = {
  'בשר': 'meat',
  'meat': 'meat',
  'עוף': 'chicken',
  'chicken': 'chicken',
  'טבעוני': 'vegan',
  'vegan': 'vegan',
  'ילדים': 'kids',
  'kids': 'kids',
};

async function importFromExcel(buffer, weddingId) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const errors = [];
  let invitationsCreated = 0;
  let guestsCreated = 0;

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const row = normalizeRowKeys(rawRow);

    try {
      const householdName = String(row.householdName || row.firstName || '').trim();
      if (!householdName) {
        errors.push(`Row ${i + 2}: missing household/first name - skipped`);
        continue;
      }

      const amount = parseAmount(row.amount);
      const side = SIDE_PARSE[String(row.side || '').trim().toLowerCase()] || 'mutual';
      const group = GROUP_PARSE[String(row.group || '').trim().toLowerCase()] || 'other';
      const whatsappNumber = normalizeWhatsappNumber(row.whatsappNumber);
      const notes = String(row.notes || '').trim();
      const age = parseAge(row.age);
      const mealPreference = MEAL_PARSE[String(row.mealPreference || '').trim().toLowerCase()] || 'none';
      const relationshipGroup = String(row.relationshipGroup || '').trim();
      const relationshipStrength = parseRelationshipStrength(row.relationshipStrength);

      const invitation = await Invitation.create({
        weddingId,
        householdName,
        whatsappNumber,
        rsvpStatus: 'pending',
        side,
        group,
        rsvpToken: crypto.randomUUID(),
        source: 'excel_import',
      });
      invitationsCreated++;

      const firstName = String(row.firstName || householdName.split(' ')[0] || '').trim();
      const lastName = String(row.lastName || (householdName.includes(' ') ? householdName.split(' ').slice(1).join(' ') : '')).trim();

      await Guest.create({
        weddingId,
        invitationId: invitation._id,
        firstName,
        lastName,
        mealPreference,
        amount,
        age,
        notes,
        relationshipGroup,
        relationshipStrength,
        conflictsWith: [],
        source: 'excel_import',
      });
      guestsCreated++;
    } catch (err) {
      errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }

  return { invitationsCreated, guestsCreated, errors };
}

function normalizeRowKeys(raw) {
  const result = {};
  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeHeaderKey(key);
    const mapped = COLUMN_MAP[normalized];
    if (mapped) {
      result[mapped] = value;
    } else {
      result[String(key).trim()] = value;
    }
  }
  return result;
}

function normalizeHeaderKey(key) {
  return String(key)
    .trim()
    .replace(/['"`׳״]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeWhatsappNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
}

function parseAmount(val) {
  const n = parseInt(val, 10);
  if (!isNaN(n) && n >= 1 && n <= 20) return n;
  return 1;
}

function parseAge(val) {
  const n = parseInt(val, 10);
  if (!isNaN(n) && n >= 0 && n <= 120) return n;
  return null;
}

function parseRelationshipStrength(val) {
  const n = parseInt(val, 10);
  if (!isNaN(n) && n >= 1 && n <= 5) return n;
  return null;
}

module.exports = { importFromExcel };
