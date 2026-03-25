'use strict';

/**
 * Israeli wedding alcohol calculator.
 * Based on typical Israeli wedding consumption averages per confirmed adult.
 *
 * Estimates per adult for a ~5-hour evening wedding:
 *   Beer:    3 bottles (330ml)
 *   Wine:    1/3 bottle (750ml) → ~2.5 glasses
 *   Vodka:   0.05 bottles (700ml)
 *   Whiskey: 0.05 bottles (700ml)
 *   Arak:    0.08 bottles (750ml)
 */
const PER_ADULT = {
  beer_bottles_330ml: 3,
  wine_bottles_750ml: 0.33,
  vodka_bottles_700ml: 0.05,
  whiskey_bottles_700ml: 0.05,
  arak_bottles_750ml: 0.08,
};

/**
 * Calculates total alcohol needed for a wedding.
 *
 * @param {number} confirmedAdults — count of confirmed adult guests
 * @param {number} [buffer=0.15] — safety buffer percentage (default 15%)
 * @returns {object} Rounded up bottle counts with buffer applied
 */
function calculateAlcohol(confirmedAdults, buffer = 0.15) {
  const factor = confirmedAdults * (1 + buffer);

  return {
    beer_bottles:    Math.ceil(PER_ADULT.beer_bottles_330ml    * factor),
    wine_bottles:    Math.ceil(PER_ADULT.wine_bottles_750ml    * factor),
    vodka_bottles:   Math.ceil(PER_ADULT.vodka_bottles_700ml   * factor),
    whiskey_bottles: Math.ceil(PER_ADULT.whiskey_bottles_700ml * factor),
    arak_bottles:    Math.ceil(PER_ADULT.arak_bottles_750ml    * factor),
    perAdultRatios:  PER_ADULT,
    confirmedAdults,
    bufferPercent:   Math.round(buffer * 100),
  };
}

module.exports = { calculateAlcohol, PER_ADULT };
