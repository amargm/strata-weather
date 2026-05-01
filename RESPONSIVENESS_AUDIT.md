# Responsiveness Audit

## Status: Partially Fixed

Key responsiveness issues have been addressed. Remaining items are low-risk on portrait-locked mobile.

---

## FIXED Issues

### 1. ~~Module-level `Dimensions.get('window')`~~ — ACCEPTED
- App is portrait-locked; dimensions never change at runtime
- This is standard practice for portrait-only React Native apps
- **Status**: No action needed

### 2. ~~LoadingScreen Particle Animation Off-Screen~~ — FIXED ✓
- Rings now use a centered flexbox container (`ringsContainer` with `alignItems: 'center'`)
- Ring sizes scaled to screen: `RING_BASE = Math.min(W,H) * 0.12`, `RING_STEP = 0.11`
- Particles use `left`/`top` for initial position + `translateY` for drift only
- No more popping from off-screen edge

### 3. ~~140px Temperature Font (NowScreen)~~ — FIXED ✓
- Now uses `ms(120, 0.4)` — moderately scaled based on screen width
- On 320dp screen: ~104px. On 390dp: ~120px. On 414dp: ~125px.
- Scales proportionally without looking too small

### 4. ~~Fixed `paddingTop: 52` Everywhere~~ — FIXED ✓
- All 5 screens now use `getStatusBarPadding()` from `src/utils/responsive.ts`
- Android: `StatusBar.currentHeight + 12` (adapts to device)
- iOS: 48px fallback (accounts for notch)

### 5. ~~Horizontal paddings hardcoded~~ — FIXED ✓
- NowScreen: `paddingHorizontal: sw(28)` (scaled to width)
- AtmosphereScreen: `paddingHorizontal: sw(28)`
- HourlyScreen: `paddingHorizontal: sw(28)`
- ForecastScreen: `paddingHorizontal: sw(28)`
- ScienceScreen: `paddingHorizontal: sw(28)`

### 6. ~~NowScreen margins/sizes~~ — FIXED ✓
- `tempStage marginTop` → `sh(-20)` (scaled)
- `tempUnitMark` → `ms(30, 0.4)` (scaled)
- `conditionLong maxWidth` → `sw(260)` (scaled)
- `nowFooter` paddings → `sw(28)`, `sh(28)` (scaled)

---

## REMAINING Issues (Low Risk)

These are acceptable on a portrait-locked mobile app targeting standard phone sizes (360-430dp wide):

### ForecastScreen — Fixed Column Widths
| Item | Value | Risk |
|------|-------|------|
| dayCol width: 70 | Fixed px | Acceptable — "Today" and day names fit in 70dp on all phone sizes |
| fcIcon width: 28 | Fixed px | Single emoji, always fits |
| tempsCol width: 60 | Fixed px | "38° 22°" fits in 60dp |
| fcPrecip width: 32 | Fixed px | "99%" fits in 32dp |
| **Total fixed: 190dp** | On 320dp screen, bar cell ~74dp | Tight but functional |

### AtmosphereScreen — Cell Sizing
| Item | Value | Risk |
|------|-------|------|
| cellVal fontSize: 34 | Fixed px | Values like "1024" display fine at this size in 50% width cells |
| cell paddingHorizontal: 22 | Fixed px | Could use `sw(22)` but current value works on 360dp+ screens |

### HourlyScreen — Tape Item Width
| Item | Value | Risk |
|------|-------|------|
| ITEM_WIDTH = 68 | Fixed px | Horizontal scrolling means it works regardless of screen width |
| windBig fontSize: 36 | Fixed px | Wind speeds rarely exceed 3 digits, fits in half-screen |

### ScienceScreen — Block Sizing
| Item | Value | Risk |
|------|-------|------|
| block padding: 18 | Fixed px | Works in 50% width cells on 360dp+ |
| val fontSize: 32 | Fixed px | Pressure "1024" is the longest value, fits fine |
| uvMarker not offset by half width | 11px marker | At max UV, marker extends 5.5px past bar right edge — cosmetic only |

### App.tsx — Nav/Hints
| Item | Value | Risk |
|------|-------|------|
| navContainer right:16, bottom:40 | Fixed px | Dots are tiny (6px), 16dp from edge is fine on all phones |
| swipeHint bottom:90 | Fixed px | Only shown once on first launch, acceptable |

---

## Responsive Utilities Added

File: `src/utils/responsive.ts`

```typescript
sw(size)  // Scale width — proportional to 390dp base
sh(size)  // Scale height — proportional to 844dp base
ms(size, factor=0.5)  // Moderate scale — for font sizes
getStatusBarPadding()  // StatusBar.currentHeight + 12 (Android) / 48 (iOS)
```

---

## Design Constraints (Accepted)

- **Portrait-only**: Module-level `Dimensions.get('window')` is fine since orientation is locked
- **Target devices**: 360dp–430dp wide (covers 95%+ of Android phones)
- **Minimum supported**: 320dp wide (all fixed elements still fit)
- **Horizontal scroll**: HourlyScreen tape width doesn't need responsive scaling since it scrolls
