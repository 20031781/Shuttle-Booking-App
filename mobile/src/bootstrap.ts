/**
 * Inizializzazione nativa, eseguita prima di qualunque componente.
 *
 * Metro sceglie automaticamente il file per piattaforma: sul bundle web viene
 * usato `bootstrap.web.ts` al posto di questo, senza bisogno di controlli
 * `Platform.OS` sparsi nel codice.
 */

// `react-native-gesture-handler` deve essere valutato prima dell'albero React,
// altrimenti su Android i gesti dello stack navigator non si registrano.
// Stando qui, il vincolo è esplicito e non si rompe se qualcuno riordina gli
// import di App.tsx (cosa che un `--fix` di ESLint può fare da solo).
import 'react-native-gesture-handler';
