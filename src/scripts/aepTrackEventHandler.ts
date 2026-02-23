import { executeScript } from '../utils/script.js';

export default function aepTrackEventHandlerScript(event?: Event, testMode: boolean = false): null {
  return executeScript(
    {
      scriptName: 'Custom AEP Track Event',
      testMode,
      testHeaderTitle: 'CUSTOM AEP TRACK EVENT - TEST MODE',
      onError: (error, logger) => {
        logger.error('Unexpected error in custom AEP track event script:', error);
        return null;
      },
    },
    (logger) => {
      if (!event) {
        logger.log('No event received');
        return null;
      }

      const aepEvent = event as unknown as { $type: string; detail: unknown };
      logger.log('AEP Track Event received', {
        type: aepEvent.$type,
        detail: aepEvent.detail,
      });

      return null;
    }
  );
}
