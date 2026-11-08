// @fontsource/big-shoulders-display maps "./*" to "./*.css", so main.ts imports ".../800" with no
// .css suffix. Vite's "*.css" declaration cannot match that specifier, so declare it here.
declare module '@fontsource/big-shoulders-display/*'
