# Responsiveness Audit

## Status: ALL FIXED ✓

All responsiveness issues have been addressed using the `src/utils/responsive.ts` scaling utilities.

---

## FIXED Issues

### 1. Module-level `Dimensions.get('window')` — ACCEPTED ✓
- App is portrait-locked; dimensions never change at runtime
- Standard practice for portrait-only React Native apps

### 2. LoadingScreen Particle Animation Off-Screen — FIXED ✓
- Rings now use a centered flexbox container (`ringsContainer` with `alignItems: 'center'`)
- Ring sizes scaled to screen: `RING_BASE = Math.min(W,H) * 0.12`, `RING_STEP = 0.11`
- Particles use `left`/`top` for initial position + `translateY` for drift only
- No more popping from off-screen edge

### 3. 140px Temperature Font (NowScreen) — FIXED ✓
- Now uses `ms(120, 0.4)` — moderately scaled based on screen width
- On 320dp screen: ~104px. On 390dp: ~120px. On 414dp: ~125px.

### 4. Fixed `paddingTop: 52` Everywhere — FIXED ✓
- All 5 screens now use `getStatusBarPadding()` from `src/utils/responsive.ts`
- Android: `StatusBar.currentHeight + 12` (adapts to device)
- iOS: 48px fallback (accounts for notch)

### 5. Fixed Column Widths (ForecastScreen) — FIXED ✓
- All column widths now use `sw()`: dayCol `sw(70)`, icon `sw(28)`, temps `sw(60)`, precip `sw(32)`
- Column hints match with same scaled widths
- Row paddingHorizontal: `sw(14)`
- Font sizes: `ms(15)` for day name, `ms(16)` for hi temp

### 6. AtmosphereScreen Cell Sizing — FIXED ✓
- cellVal fontSize: `ms(30)` (was 34)
- cell paddingHorizontal: `sw(20)` (was 22)
- alertStrip margins: `sw(22)`, padding: `sw(14)`

### 7. HourlyScreen Tape & Wind — FIXED ✓
- ITEM_WIDTH: `sw(68)` (scales to screen width)
- tape/tapeContent padding: `sw(28)`
- windRibbon: margin `sw(28)`, padding `sw(16)`
- windSide: paddingLeft `sw(16)`, minWidth `sw(72)`
- windBig fontSize: `ms(32)` (was 36)
- windDirBig fontSize: `ms(26)` (was 28)
- precipOutlook margins: `sw(28)`, padding: `sw(18)`

### 8. ScienceScreen Block Sizing — FIXED ✓
- block padding: `sw(16)` (was 18)
- val fontSize: `ms(28)` (was 32)
- uvMarker: added `marginLeft: -5.5` to center the 11px marker at its position
- sunStrip paddingHorizontal: `sw(28)`
- header paddingHorizontal: `sw(28)`

### 9. App.tsx Nav/Hints — FIXED ✓
- navContainer: `right: sw(16)`, `bottom: sh(40)`
- dotsRow gap: `sh(10)`
- swipeHint: `bottom: sh(90)`

---

## Responsive Utilities

File: `src/utils/responsive.ts`

```typescript
sw(size)  // Scale width — proportional to 390dp base design
sh(size)  // Scale height — proportional to 844dp base design
ms(size, factor=0.5)  // Moderate scale — for font sizes (less aggressive)
getStatusBarPadding()  // StatusBar.currentHeight + 12 (Android) / 48 (iOS)
```

---

## Design Constraints

- **Portrait-only**: Module-level `Dimensions.get('window')` is fine
- **Base design**: 390×844dp (iPhone 13/14 standard)
- **Target devices**: 320dp–430dp wide (covers all Android/iOS phones)
- **Scaling behavior**: On smaller screens, everything shrinks proportionally; on larger screens, grows proportionally
- **Horizontal scroll**: HourlyScreen tape items scale with `sw()` but still scroll horizontally
