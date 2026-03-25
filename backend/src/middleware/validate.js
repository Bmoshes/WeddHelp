'use strict';

/**
 * Zod validation middleware factory.
 * Usage: router.post('/route', validate(myZodSchema), handler)
 *
 * Validates req.body by default. Pass `target` to validate params or query.
 */
module.exports = function validate(schema, target = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: result.error.flatten().fieldErrors,
      });
    }
    // Replace with parsed+coerced data
    req[target] = result.data;
    next();
  };
};
