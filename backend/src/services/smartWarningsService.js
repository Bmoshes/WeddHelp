'use strict';

const Guest = require('../models/Guest');
const Invitation = require('../models/Invitation');
const Task = require('../models/Task');
const SeatingPlan = require('../models/SeatingPlan');

/**
 * Generates smart warnings for a wedding dashboard.
 * All queries are tenant-scoped by weddingId.
 *
 * Warning types:
 *   - unassigned_going_guests  : guests with rsvp=going but no table assignment
 *   - overcapacity_tables      : tables where assignedGuests > capacity
 *   - overdue_tasks            : tasks past their dueDate and not done
 *   - pending_rsvp             : invitations still in 'pending' state
 *
 * @param {string} weddingId
 * @returns {Promise<Array>} Array of warning objects { type, message, count?, data? }
 */
async function getWarnings(weddingId) {
  const warnings = [];
  const now = new Date();

  // 1. Guests confirmed (going) but not assigned to a table
  const goingInvitations = await Invitation.find({
    weddingId,
    rsvpStatus: { $in: ['going', 'pending', 'maybe'] },
    isDeleted: false,
  }).select('_id').lean();

  const goingInvitationIds = goingInvitations.map(i => i._id);

  const unassignedCount = await Guest.countDocuments({
    weddingId,
    invitationId: { $in: goingInvitationIds },
    assignedTableId: null,
    isDeleted: false,
  });

  if (unassignedCount > 0) {
    warnings.push({
      type: 'unassigned_going_guests',
      message: `${unassignedCount} אורחים שאישרו הגעה עדיין לא שובצו לשולחן`,
      count: unassignedCount,
    });
  }

  // 2. Overcapacity tables (from SeatingPlan)
  const plan = await SeatingPlan.findOne({ weddingId }).lean();
  if (plan) {
    const overcapacity = plan.tables.filter(
      t => t.assignedGuestIds.length > t.capacity
    );
    if (overcapacity.length > 0) {
      warnings.push({
        type: 'overcapacity_tables',
        message: `${overcapacity.length} שולחנות חורגים מהקיבולת המותרת`,
        count: overcapacity.length,
        data: overcapacity.map(t => ({ tableId: t.tableId, number: t.number })),
      });
    }
  }

  // 3. Overdue tasks
  const overdueCount = await Task.countDocuments({
    weddingId,
    isDone: false,
    dueDate: { $lt: now },
  });

  if (overdueCount > 0) {
    warnings.push({
      type: 'overdue_tasks',
      message: `${overdueCount} משימות שעברו את תאריך היעד ועדיין לא הושלמו`,
      count: overdueCount,
    });
  }

  // 4. Pending RSVP invitations
  const pendingCount = await Invitation.countDocuments({
    weddingId, rsvpStatus: 'pending', isDeleted: false,
  });

  if (pendingCount > 0) {
    warnings.push({
      type: 'pending_rsvp',
      message: `${pendingCount} הזמנות טרם אישרו / דחו הגעה`,
      count: pendingCount,
    });
  }

  return warnings;
}

module.exports = { getWarnings };
