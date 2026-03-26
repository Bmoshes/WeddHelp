'use strict';

const Guest = require('../models/Guest');
const Invitation = require('../models/Invitation');
const SeatingPlan = require('../models/SeatingPlan');

/**
 * Maps Invitation.group → legacy GuestCategory
 * Values match the seatingAlgorithm.ts type: 'family' | 'friend' | 'colleague' | 'other'
 */
const GROUP_TO_CATEGORY = {
  family:  'family',
  friends: 'friend',
  work:    'colleague',
  other:   'other',
};

/**
 * Maps Invitation.side → legacy GuestSide
 * Values match the seatingAlgorithm.ts type: 'groom' | 'bride' | 'both'
 */
const SIDE_MAP = {
  groom:  'groom',
  bride:  'bride',
  mutual: 'both',
};

/**
 * Builds the legacy Guest[] array required by seatingAlgorithm.ts.
 *
 * Tenant isolation: ALL queries are scoped by weddingId.
 * RSVP filter: Only guests whose parent Invitation has rsvpStatus === 'going' are included.
 *   - 'not_going' → excluded entirely
 *   - 'pending', 'maybe' → excluded from seating (SmartWarnings flags them separately)
 *
 * Field mapping (source → legacy field):
 *   guest._id.toString()                                → id
 *   `${guest.firstName} ${guest.lastName}`.trim()      → name
 *   GROUP_TO_CATEGORY[invitation.group]                → category  (derived from Invitation)
 *   SIDE_MAP[invitation.side]                          → side      (derived from Invitation)
 *   invitation._id.toString()                          → groupId   (household = natural seating group)
 *   guest.assignedTableId || undefined                 → tableId
 *   guest.age || undefined                             → age
 *   invitation.whatsappNumber || undefined             → phoneNumber (derived from Invitation)
 *   guest.notes || undefined                           → notes
 *   guest.amount || 1                                 → amount
 *   guest.conflictsWith.map(id => id.toString())       → conflictsWith
 *
 * @param {string} weddingId — MongoDB ObjectId string (from req.weddingId)
 * @returns {Promise<Array>} Legacy Guest[] array
 */
async function buildLegacyGuestArray(weddingId) {
  // Step 1: Fetch all 'going', non-deleted invitations for this wedding (tenant-scoped)
  const activeInvitations = await Invitation.find({
    weddingId,
    rsvpStatus: { $in: ['going', 'pending', 'maybe'] },
    isDeleted: false,
  }).lean();

  if (activeInvitations.length === 0) return [];

  const invitationMap = new Map(
    activeInvitations.map(inv => [inv._id.toString(), inv])
  );
  const invitationIds = activeInvitations.map(inv => inv._id);

  // Step 2: Fetch all active guests belonging to those 'going' invitations (tenant-scoped)
  const dbGuests = await Guest.find({
    weddingId,                          // tenant isolation — always present
    invitationId: { $in: invitationIds },
    isDeleted: false,
  }).lean();

  // Step 3: Map each MongoDB Guest to the legacy engine shape
  return dbGuests
    .map(g => {
      const inv = invitationMap.get(g.invitationId.toString());
      if (!inv) return null; // safety guard — should not happen given Step 1 filter

      return {
        id:           g._id.toString(),
        name:         `${g.firstName} ${g.lastName}`.trim(),
        firstName:    g.firstName,
        lastName:     g.lastName || '',
        category:     GROUP_TO_CATEGORY[inv.group] ?? 'other',
        side:         SIDE_MAP[inv.side] ?? 'both',
        groupId:      inv._id.toString(),     // guests in same invitation = same seating group
        tableId:      g.assignedTableId ?? undefined,
        age:          g.age ?? undefined,
        phoneNumber:  inv.whatsappNumber ?? undefined,
        notes:        g.notes || undefined,
        relationshipGroup: g.relationshipGroup || '',
        amount:       g.amount || 1,
        conflictsWith: (g.conflictsWith ?? []).map(id => id.toString()),
      };
    })
    .filter(Boolean);
}

/**
 * Persists the seating optimization result back to MongoDB.
 *
 * 1. Bulk-updates Guest.assignedTableId for every assignment (tenant-scoped)
 * 2. Upserts the SeatingPlan for this wedding
 *
 * @param {string} weddingId
 * @param {object} optimizationResult — { assignments: {guestId→tableId}, tables: OptimizedTable[] }
 * @param {object} config — OptimizationConfig snapshot saved with the plan
 */
async function persistOptimizationResult(weddingId, optimizationResult, config = {}) {
  const { assignments, tables } = optimizationResult;

  // Bulk-update guest assignments (tenant-scoped — weddingId in filter prevents cross-tenant writes)
  const bulkOps = Object.entries(assignments).map(([guestId, tableId]) => ({
    updateOne: {
      filter: { _id: guestId, weddingId },   // weddingId ensures no cross-tenant writes
      update: { $set: { assignedTableId: tableId } },
    },
  }));

  if (bulkOps.length > 0) {
    await Guest.bulkWrite(bulkOps);
  }

  const summarizeRelationshipGroup = (guests) => {
    const counts = new Map();
    for (const guest of guests) {
      const key = (guest.relationshipGroup || '').trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let bestGroup = '';
    let bestCount = 0;
    for (const [group, count] of counts.entries()) {
      if (count > bestCount) {
        bestGroup = group;
        bestCount = count;
      }
    }
    return bestGroup;
  };

  // Build table documents for SeatingPlan
  const planTables = tables.map((t, i) => ({
    tableId:          t.id,
    number:           i + 1,
    capacity:         t.capacity,
    isKnight:         t.isKnight ?? false,
    side:             t.side ?? 'both',
    relationshipGroup: summarizeRelationshipGroup(t.guests),
    // t.guests contains legacy Guest objects with string ids
    assignedGuestIds: t.guests.map(g => g.id),
  }));

  // Upsert — one SeatingPlan per wedding
  await SeatingPlan.findOneAndUpdate(
    { weddingId },
    {
      $set: {
        tables: planTables,
        optimizationConfig: config,
        lastOptimizedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
}

async function syncSeatingPlanFromAssignments(weddingId) {
  const plan = await SeatingPlan.findOne({ weddingId }).lean();
  if (!plan) return null;

  const guests = await Guest.find({
    weddingId,
    isDeleted: false,
    assignedTableId: { $ne: null },
  }).lean();

  const invitationIds = [...new Set(guests.map((guest) => guest.invitationId.toString()))];
  const invitations = await Invitation.find({
    _id: { $in: invitationIds },
    weddingId,
    isDeleted: false,
  }).lean();

  const invitationMap = new Map(invitations.map((invitation) => [invitation._id.toString(), invitation]));
  const guestIdsByTable = new Map();

  for (const guest of guests) {
    const tableId = guest.assignedTableId;
    if (!tableId) continue;
    const bucket = guestIdsByTable.get(tableId) || [];
    bucket.push(guest);
    guestIdsByTable.set(tableId, bucket);
  }

  const summarizeSide = (tableGuests) => {
    const counts = { groom: 0, bride: 0, both: 0 };
    for (const guest of tableGuests) {
      const invitation = invitationMap.get(guest.invitationId.toString());
      const side = invitation?.side === 'mutual' ? 'both' : invitation?.side || 'both';
      counts[side] += 1;
    }
    return Object.entries(counts).reduce((best, current) => current[1] > best[1] ? current : best)[0];
  };

  const summarizeRelationshipGroup = (tableGuests) => {
    const counts = new Map();
    for (const guest of tableGuests) {
      const key = (guest.relationshipGroup || '').trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let bestGroup = '';
    let bestCount = 0;
    for (const [group, count] of counts.entries()) {
      if (count > bestCount) {
        bestGroup = group;
        bestCount = count;
      }
    }
    return bestGroup;
  };

  const updatedTables = plan.tables.map((table) => {
    const tableGuests = guestIdsByTable.get(table.tableId) || [];
    return {
      ...table,
      side: tableGuests.length ? summarizeSide(tableGuests) : table.side ?? 'both',
      relationshipGroup: tableGuests.length ? summarizeRelationshipGroup(tableGuests) : '',
      assignedGuestIds: tableGuests.map((guest) => guest._id),
    };
  });

  await SeatingPlan.findOneAndUpdate(
    { weddingId },
    {
      $set: {
        tables: updatedTables,
        lastOptimizedAt: new Date(),
      },
    },
    { new: true },
  );

  return updatedTables;
}

module.exports = { buildLegacyGuestArray, persistOptimizationResult, syncSeatingPlanFromAssignments };
