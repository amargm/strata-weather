# Responsiveness Audit

## Critical Issues

### 1. Module-level `Dimensions.get('window')` (Stale Values)
- **App.tsx (line 48)**: `SCREEN_HEIGHT` used for layer heights, snap intervals, parallax math — never updates
- **LoadingScreen.tsx (line 5)**: `W`, `H`, `CENTER_X`, `CENTER_Y` — rings/particles positioned with stale coords
- **Fix**: Use `useWindowDimensions()` for reactive updates, or accept portrait-only lock as constraint

### 2. LoadingScreen Particle Animation Off-Screen
- Particles use `translateX: Math.random() * W` as if it's absolute position, but `translateX` is relative to element's top-left (0,0)
- A particle element at left:0 with `translateX: W` renders at the right edge — looks like it "pops" from off-screen
- Rings use absolute pixel positioning from `CENTER_X`/`CENTER_Y` — works fine if dimensions match
- **Fix**: Position particles with `left`/`top` absolute styles instead of `translateX`/`translateY` for initial placement

### 3. 140px Temperature Font (NowScreen)
- `fontSize: 140` overflows on screens < 640dp tall
- No `adjustsFontSizeToFit` or scaling applied
- Combined with topBar (52px padding), footer, and content, total exceeds short screen heights
- **Fix**: Scale font based on screen height or use `adjustsFontSizeToFit`

### 4. Fixed `paddingTop: 52` Everywhere
- All 5 screens use `paddingTop: 52` for header area
- Doesn't account for varying status bar heights (notch, punch-hole, dynamic island)
- **Fix**: Use `react-native-safe-area-context` `useSafeAreaInsets()` or at minimum `StatusBar.currentHeight`

### 5. Fixed Column Widths (ForecastScreen)
- Row total: dayCol(70) + icon(28) + bar(flex:1) + temps(60) + precip(32) = 190dp fixed + padding
- On 320dp screen with 28dp total padding → bar cell gets only ~74dp
- **Fix**: Use percentage widths or scale columns based on screen width

---

## Per-Screen Findings

### App.tsx
| Issue | Value | Impact |
|-------|-------|--------|
| Layer wrappers `height: SCREEN_HEIGHT` | Module constant | Stale after rotate |
| `snapToInterval={SCREEN_HEIGHT}` | Module constant | Misaligned after rotate |
| `navContainer` right:16, bottom:40 | Fixed px | Could overlap on tiny screens |
| `swipeHint` bottom:90 | Fixed px | May clip on short screens |

### NowScreen.tsx
| Issue | Value | Impact |
|-------|-------|--------|
| blob1: 340×340, top:-80, left:-60 | Fixed px | Overdraw on small screens |
| blob2: 260×200, bottom:-40, right:-40 | Fixed px | Same |
| tempSuper fontSize:140 | Fixed px | **Overflows on short screens** |
| paddingTop:52 | Fixed px | No safe area awareness |
| tempStage marginTop:-40 | Fixed negative | Can push content above viewport |
| conditionLong maxWidth:260 | Fixed px | Wastes space on wide screens |

### AtmosphereScreen.tsx
| Issue | Value | Impact |
|-------|-------|--------|
| paddingTop:52 | Fixed px | No safe area |
| cellVal fontSize:34 | Fixed px | Long values clip in 50%-width cells on 320dp |
| cell paddingHorizontal:22 | Fixed px | 44dp total per cell is aggressive on narrow screens |

### HourlyScreen.tsx
| Issue | Value | Impact |
|-------|-------|--------|
| ITEM_WIDTH=68 | Fixed px | Not scaled to screen width |
| paddingTop:52 | Fixed px | No safe area |
| windRibbon margin+padding total 92dp | Fixed px | Tight on 320dp |
| windBig fontSize:36 | Fixed px | Large values may clip |

### ForecastScreen.tsx
| Issue | Value | Impact |
|-------|-------|--------|
| Column widths total 190dp fixed | Fixed px | Bar cell very small on narrow screens |
| paddingHorizontal:14 rows | Fixed px | Less space for content |
| fcDay fontSize:16 in width:70 | Fixed px | Long localized names overflow |

### ScienceScreen.tsx
| Issue | Value | Impact |
|-------|-------|--------|
| block padding:18 in 50% width | Fixed px | ~124dp content on 320dp screen |
| val fontSize:32 | Fixed px | "1024" borderline in narrow cells |
| uvMarker not offset by half width | 11px wide | Overflows at 100% position |
| sunStrip paddingHorizontal:28 | Fixed px | Three columns crowd on narrow |

### LoadingScreen.tsx
| Issue | Value | Impact |
|-------|-------|--------|
| Module-level W, H, CENTER_X, CENTER_Y | Stale | Mispositioned after rotate |
| Largest ring 280dp | Fixed | Clips on < 320dp screens |
| Particles use translateX/Y as absolute pos | Misconception | Start off-screen, pop into view |
| textArea height: H*0.35 | Stale H | Wrong height after rotate |

---

## Recommended Strategy

Since this is a **portrait-locked mobile weather app**, the module-level `Dimensions.get('window')` is acceptable for layer heights (orientation won't change). The key fixes are:

1. **LoadingScreen**: Fix particle positioning to use `left`/`top` instead of `translateX`/`translateY` for initial placement
2. **Responsive font scaling**: Use screen-relative sizes for the giant temperature display
3. **Safe area padding**: Replace hardcoded `paddingTop: 52` with dynamic status bar height
4. **Percentage-based sizing**: Convert fixed pixel values to percentages where possible
5. **Minimum viable screen**: Target 320dp×568dp (iPhone SE) as the smallest supported size
