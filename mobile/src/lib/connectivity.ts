import {checkApiReachability, getApiStatusSnapshot} from '@/api/apiStatus';
import {isNetworkOnline} from '@/api/networkStatus';

/**
 * Evita di far aspettare all'utente il timeout pieno di una richiesta quando già
 * sappiamo che non andrà a buon fine.
 *
 * Lo stato di rete arriva dal listener nativo, quindi è affidabile subito. Lo stato
 * dell'API invece può essere stale proprio nel caso che conta ("il backend è appena
 * tornato su"): solo in quel caso lo riconfermiamo con un healthcheck rapido, invece
 * di saltare la chiamata basandoci su un dato vecchio.
 */
export async function shouldSkipNetworkFetch(): Promise<boolean> {
    const isOnline = await isNetworkOnline().catch(() => true);
    if (!isOnline) {
        return true;
    }

    if (getApiStatusSnapshot().isApiReachable === false) {
        const reachable = await checkApiReachability();
        return !reachable;
    }

    return false;
}
