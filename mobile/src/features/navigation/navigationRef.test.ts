import {beforeEach, describe, expect, it, vi} from 'vitest';

import {navigateToTab} from './navigationRef';

const {navigationRefMock, createNavigationContainerRefMock} = vi.hoisted(() => {
    const navigationRef = {
        getRootState: vi.fn(),
        isReady: vi.fn(),
        navigate: vi.fn()
    };

    return {
        navigationRefMock: navigationRef,
        createNavigationContainerRefMock: vi.fn(() => navigationRef)
    };
});

vi.mock('@react-navigation/native', () => ({
    createNavigationContainerRef: createNavigationContainerRefMock
}));

describe('navigateToTab', () => {
    beforeEach(() => {
        navigationRefMock.isReady.mockReset();
        navigationRefMock.getRootState.mockReset();
        navigationRefMock.navigate.mockReset();
    });

    it('ignora la navigazione prima del mount del navigator', () => {
        navigationRefMock.isReady.mockReturnValue(false);

        expect(navigateToTab('shuttle')).toBe(false);
        expect(navigationRefMock.navigate).not.toHaveBeenCalled();
    });

    it('ignora una rotta non presente nel navigator corrente', () => {
        navigationRefMock.isReady.mockReturnValue(true);
        navigationRefMock.getRootState.mockReturnValue({routeNames: ['shuttle', 'profile']});

        expect(navigateToTab('manager')).toBe(false);
        expect(navigationRefMock.navigate).not.toHaveBeenCalled();
    });

    it('naviga quando la rotta è montata', () => {
        navigationRefMock.isReady.mockReturnValue(true);
        navigationRefMock.getRootState.mockReturnValue({routeNames: ['shuttle', 'bookings']});

        expect(navigateToTab('bookings')).toBe(true);
        expect(navigationRefMock.navigate).toHaveBeenCalledWith('bookings');
    });
});
