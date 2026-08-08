// Entry point dell'app, al posto del default `expo/AppEntry`.
//
// L'ordine degli import qui sotto NON è indifferente: il bootstrap nativo deve
// essere valutato prima di App.tsx. Le specifiche ES garantiscono che i moduli
// siano valutati nell'ordine in cui compaiono gli import, quindi basta non
// spostare la prima riga — e `src/bootstrap.test.ts` verifica proprio questo,
// così un eventuale riordino automatico degli import fa fallire i test invece
// di rompere i gesti su Android in silenzio.
import './src/bootstrap';

import {registerRootComponent} from 'expo';

import App from './App';

registerRootComponent(App);
