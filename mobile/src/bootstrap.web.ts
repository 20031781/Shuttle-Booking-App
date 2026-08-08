/**
 * Bootstrap del bundle web: deliberatamente vuoto.
 *
 * Serve a impedire che gli import nativi di `bootstrap.ts` finiscano nel bundle
 * del browser. Oggi il web non è un target attivo (manca `react-native-web`),
 * ma lo script `npm run web` esiste: senza questo file, abilitarlo tirerebbe
 * dentro le internals native di gesture-handler.
 */
export {};
