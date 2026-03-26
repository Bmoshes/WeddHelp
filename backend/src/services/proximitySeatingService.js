'use strict';

const Guest = require('../models/Guest');
const Invitation = require('../models/Invitation');

/**
 * Builds the guest array for the proximity algorithm.
 *
 * Includes the same RSVP filter and tenant isolation as buildLegacyGuestArray,
 * but returns proximity-specific fields (lastName, relationshipGroup,
 * relationshipStrength) instead of legacy engine fields.
 *
 * @param {string} weddingId
 * @returns {Promise<Array>}
 */
async function buildProximityGuestArray(weddingId) {
  const activeInvitations = await Invitation.find({
    weddingId,
    rsvpStatus: { $in: ['going', 'pending', 'maybe'] },
    isDeleted: false,
  }).lean();

  if (activeInvitations.length === 0) return [];

  const invitationMap = new Map(
    activeInvitations.map(inv => [inv._id.toString(), inv]),
  );
  const invitationIds = activeInvitations.map(inv => inv._id);

  const dbGuests = await Guest.find({
    weddingId,
    invitationId: { $in: invitationIds },
    isDeleted: false,
  }).lean();

  return dbGuests
    .map(g => {
      const inv = invitationMap.get(g.invitationId.toString());
      if (!inv) return null;

      return {
        id:                  g._id.toString(),
        name:                `${g.firstName} ${g.lastName || ''}`.trim(),
        firstName:           g.firstName,
        lastName:            g.lastName || '',
        amount:              g.amount || 1,
        groupId:             inv._id.toString(),
        relationshipGroup:   g.relationshipGroup || '',
        relationshipStrength: g.relationshipStrength || 1,
        side:                inv.side === 'mutual' ? 'both' : inv.side,
        conflictsWith:       (g.conflictsWith ?? []).map(id => id.toString()),
      };
    })
    .filter(Boolean);
}

/**
 * Runs the proximity-aware seating optimization for the given wedding.
 *
 * Lazy-loads the compiled algorithm from `backend/dist/utils/proximityAlgorithm`.
 * Run `npm run build:algo` at repo root to (re)compile.
 *
 * Returns the same `{ assignments, tables }` shape expected by
 * `persistOptimizationResult` in seatingAdapterService.js.
 *
 * @param {string} weddingId
 * @param {{ tableCapacity?: number }} config
 * @returns {Promise<{ assignments: object, tables: Array }>}
 */
async function runProximityOptimization(weddingId, config = {}) {
  let runProximityAlgorithm;
  try {
    ({ runProximityAlgorithm } = require('../../dist/utils/proximityAlgorithm'));
  } catch {
    const err = new Error(
      'Proximity algorithm not built. Run `npm run build:algo` at repo root first.',
    );
    err.status = 503;
    throw err;
  }

  const guests = await buildProximityGuestArray(weddingId);

  if (guests.length === 0) return null;

  return runProximityAlgorithm(guests, {
    tableCapacity: config.tableCapacity ?? 12,
    knightConfig: config.knightConfig ?? { enabled: false, count: 0, capacity: 20 },
    knightGroupNames: config.knightGroupNames ?? [],
  });
}

module.exports = { runProximityOptimization };
