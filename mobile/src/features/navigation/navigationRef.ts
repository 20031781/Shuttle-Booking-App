import {createNavigationContainerRef} from '@react-navigation/native';

import type {AppTabParamList} from './routes';

export const navigationRef = createNavigationContainerRef<AppTabParamList>();

/**
 * Naviga a un tab da fuori dall'albero React (es. dal tap su una notifica push).
 * Se la navigazione non è ancora montata, o il tab non è visibile per l'utente
 * corrente (admin/manager), l'operazione viene ignorata senza errori.
 */
export function navigateToTab(tab: keyof AppTabParamList): boolean {
    if (!navigationRef.isReady()) {
        return false;
    }

    // I tab admin/manager esistono solo per gli utenti abilitati: navigare verso
    // una rotta non montata lancerebbe, quindi la verifichiamo prima.
    if (!navigationRef.getRootState().routeNames.includes(tab)) {
        return false;
    }

    navigationRef.navigate(tab);
    return true;
}
