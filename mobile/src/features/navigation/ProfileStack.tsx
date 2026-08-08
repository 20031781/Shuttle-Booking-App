import {createStackNavigator} from '@react-navigation/stack';

import {ProfileScreen} from '@/features/profile/ProfileScreen';
import {ProfileSettingsScreen} from '@/features/profile/ProfileSettingsScreen';
import type {ProfileStackParamList} from './routes';

const Stack = createStackNavigator<ProfileStackParamList>();

type ProfileStackProps = {
    isAdmin: boolean;
};

/**
 * Il flusso Profilo → Impostazioni era gestito con un booleano interno a
 * ProfileScreen: come stack vero guadagna il gesto "indietro" e il tasto
 * back hardware di Android.
 */
export function ProfileStack({isAdmin}: ProfileStackProps) {
    return <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="ProfileHome">
            {({navigation}) => <ProfileScreen
                isAdmin={isAdmin}
                onOpenSettings={() => navigation.navigate('ProfileSettings')}
            />}
        </Stack.Screen>
        <Stack.Screen name="ProfileSettings">
            {({navigation}) => <ProfileSettingsScreen isAdmin={isAdmin} onBack={() => navigation.goBack()}/>}
        </Stack.Screen>
    </Stack.Navigator>;
}
