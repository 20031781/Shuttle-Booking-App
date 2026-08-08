import NetInfo from '@react-native-community/netinfo';

function toOnlineState(isConnected: boolean | null, isInternetReachable: boolean | null): boolean {
    if (typeof isInternetReachable === 'boolean') {
        return isInternetReachable;
    }

    return Boolean(isConnected);
}

export async function isNetworkOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return toOnlineState(state.isConnected, state.isInternetReachable);
}

export function subscribeToNetworkChanges(listener: (isOnline: boolean) => void): () => void {
    const unsubscribe = NetInfo.addEventListener(state => listener(toOnlineState(state.isConnected, state.isInternetReachable)));

    return () => unsubscribe();
}
