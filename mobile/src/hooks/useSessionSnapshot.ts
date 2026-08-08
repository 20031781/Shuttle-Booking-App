import {useEffect, useState} from 'react';

import {getSessionSnapshot, type SessionSnapshot, subscribeToSessionState} from '@/api/authSession';

/** Espone lo stato di sessione corrente e lo tiene aggiornato. */
export function useSessionSnapshot(): SessionSnapshot {
    const [snapshot, setSnapshot] = useState<SessionSnapshot>(getSessionSnapshot);

    useEffect(() => subscribeToSessionState(setSnapshot), []);

    return snapshot;
}
