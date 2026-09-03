import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useSessionSnapshot} from './useSessionSnapshot';

const {
    getSessionSnapshotMock,
    setSnapshotMock,
    subscribeToSessionStateMock,
    useEffectMock,
    useStateMock
} = vi.hoisted(() => ({
    getSessionSnapshotMock: vi.fn(),
    setSnapshotMock: vi.fn(),
    subscribeToSessionStateMock: vi.fn(),
    useEffectMock: vi.fn(),
    useStateMock: vi.fn()
}));

vi.mock('react', () => ({
    useEffect: useEffectMock,
    useState: useStateMock
}));

vi.mock('@/api/authSession', () => ({
    getSessionSnapshot: getSessionSnapshotMock,
    subscribeToSessionState: subscribeToSessionStateMock
}));

describe('useSessionSnapshot', () => {
    beforeEach(() => {
        getSessionSnapshotMock.mockReset();
        setSnapshotMock.mockReset();
        subscribeToSessionStateMock.mockReset();
        useEffectMock.mockReset();
        useStateMock.mockReset();
        useStateMock.mockImplementation(initial => [
            typeof initial === 'function' ? initial() : initial,
            setSnapshotMock
        ]);
        useEffectMock.mockImplementation(effect => effect());
    });

    it('inizializza lo snapshot e registra la sottoscrizione', () => {
        const snapshot = {isAuthenticated: true, isOfflineMode: false};
        getSessionSnapshotMock.mockReturnValue(snapshot);
        const unsubscribe = vi.fn();
        subscribeToSessionStateMock.mockReturnValue(unsubscribe);

        expect(useSessionSnapshot()).toBe(snapshot);
        expect(getSessionSnapshotMock).toHaveBeenCalledOnce();
        expect(subscribeToSessionStateMock).toHaveBeenCalledWith(setSnapshotMock);
        expect(useEffectMock).toHaveBeenCalledOnce();
    });
});
