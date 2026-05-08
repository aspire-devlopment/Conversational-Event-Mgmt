/**
 * File: idempotencyMiddleware.js
 * Purpose: Prevent duplicate direct event creation requests.
 * Description: Claims an Idempotency-Key, rejects mismatched retries, replays
 *              completed responses, and stores the final response after success.
 */
const HTTP_STATUS = require('../constants/httpStatus');
const { sendError } = require('../utils/response');
const { buildEventIdentity, hashEventIdentity } = require('../utils/eventIdentity');

const IDEMPOTENCY_SCOPE = 'api:event:create';

const createEventIdempotencyMiddleware = (idempotencyRepository) => async (req, res, next) => {
  try {
    // Idempotency is optional per request; without a key, the route behaves normally.
    const idempotencyKey = req.get('Idempotency-Key');
    const userId = req.user?.id;

    if (!idempotencyKey || !userId) {
      return next();
    }

    const identity = buildEventIdentity({
      ...req.body,
      created_by: userId,
    });
    // Hash the normalized event payload, not the raw JSON, so equivalent bodies match.
    const requestHash = hashEventIdentity(identity);
    const claimResult = await idempotencyRepository.claimRequest(
      userId,
      IDEMPOTENCY_SCOPE,
      idempotencyKey,
      requestHash
    );

    if (claimResult.state === 'mismatch') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'This Idempotency-Key was already used for a different event payload.'
      );
    }

    if (claimResult.state === 'replay') {
      return res
        .status(claimResult.record.response_status_code || HTTP_STATUS.OK)
        .json(claimResult.record.response_body);
    }

    if (claimResult.state === 'pending') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'A matching event creation request is already being processed.'
      );
    }

    req.idempotencyContext = {
      id: claimResult.record.id,
      scope: IDEMPOTENCY_SCOPE,
      key: idempotencyKey,
      requestHash,
    };
    req.idempotencyRepository = idempotencyRepository;

    const originalJson = res.json.bind(res);
    let persisted = false;
    res.json = (body) => {
      // Capture the eventual response exactly once so retries can replay it.
      if (!persisted && req.idempotencyContext?.id) {
        persisted = true;
        const resourceId =
          body?.data?.event?.id ||
          body?.createdEventId ||
          body?.duplicateEventId ||
          null;

        void idempotencyRepository.completeRequest(
          req.idempotencyContext.id,
          res.statusCode || HTTP_STATUS.OK,
          body,
          resourceId
        );
      }

      return originalJson(body);
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createEventIdempotencyMiddleware,
};
