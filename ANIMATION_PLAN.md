# Strata: Animation Brainstorm

> **Goal**: Nothing feels "stuck", "dead", or "did it register?"  
> Every surface breathes, every tap responds, every transition has intent.

---

## Current Animation Audit

| Screen | What exists | What's dead |
|--------|------------|-------------|
| **App.tsx** | Paging scroll, dot nav tap | No transition between layers — just a hard snap. Dots don't animate between states. No entry animation. |
| **NowScreen** | Fade-in + slide-up on giant temp | Ink blobs are static. Live strip has zero entrance. Top bar appears instantly. "Swipe to explore" hint is static. |
| **AtmosphereScreen** | Spring-animated metric bars (staggered) | Header/eyebrow appears instantly. Extra row (dew point, visibility) pops in with no entrance. UV marker is static. Alert strip has no entrance. |
| **HourlyScreen** | None | Entire screen is completely static. Tape items pop in with no stagger. Wind ribbon dead. Precip outlook dead. |
| **ForecastScreen** | None | Completely static. Rows appear all at once. Temp bars have no grow animation. Tapping a row has no feedback beyond opacity. |
| **ScienceScreen** | None | Completely static. Grid blocks appear all at once. UV bar marker is frozen. Sun strip has no entrance. |

---

## Animation Philosophy

- **Ink-on-paper** aesthetic: Animations should feel like ink bleeding across paper — smooth, organic, slightly unpredictable
- **Spring over timing**: Use `spring` for physics-based feel (already done in Atmosphere). Avoid linear `timing` unless fading.
- **Stagger everything**: Lists, grids, rows — never show all at once. 60–120ms stagger.
- **Scroll-linked > time-linked**: Where possible, tie animations to scroll position (reanimated `useAnimatedStyle`) rather than `useEffect` timers.
- **Micro-feedback on every touch**: Scale, opacity, or color shift on press. Nothing should feel like tapping glass.

---

## Layer-by-Layer Plan

### 0. App.tsx — Global / Layer Transitions

| Animation | Trigger | Type | Details |
|-----------|---------|------|---------|
| **Layer crossfade** | Scroll between layers | Scroll-linked (reanimated) | Each layer fades in from 0→1 opacity as it enters viewport center. Slight parallax: content slides up faster than the page. |
| **Dot nav morph** | Layer change | `withSpring` on shared value | Active dot grows width 5→20 with spring. Inactive shrinks. Use `useAnimatedStyle` per dot, driven by `scrollY`. |
| **Status bar transition** | Layer change | `withTiming` | Smooth dark↔light content transition (already switching, but it jumps). |
| **Pull-to-refresh** | Pull down on NowScreen | `onScroll` threshold | Subtle rotation of a refresh icon, haptic on trigger. |
| **Loading shimmer** | Initial load | Loop animation | "Reading the sky..." text pulses opacity 0.3↔1.0 in a slow loop. |

**Files**: `App.tsx`

---

### 1. NowScreen — Layer 00

| Animation | Trigger | Type | Details |
|-----------|---------|------|---------|
| **Ink blob drift** | Always (ambient) | Looping `Animated.timing` | Blobs slowly drift position (translateX/Y ±20px) over 8–12s, loop forever. Gives "living" background. |
| **Top bar stagger** | Screen mount / scroll-in | `stagger` + `spring` | Eyebrow → location → date slide in from left, 80ms stagger, translateX -20→0 + fade. |
| **Live strip cascade** | Mount | `stagger` + `spring` | Each live item slides in from right (translateX 30→0) + fade, 100ms stagger. |
| **Live dot pulse** | Always (ambient) | Looping `sequence` | Green dot scales 1→1.4→1 with 2s period. Says "live data". |
| **Giant temp counter** | Data arrives | Custom counting anim | Temp counts up from 0 to actual value over 800ms (like an odometer). Use `Animated.timing` interpolated to integer. |
| **H/L pills pop** | After temp settles | `spring` with delay | Scale 0→1 with slight overshoot, 200ms after temp finishes. |
| **"Swipe to explore" bob** | Always (ambient) | Looping `sequence` | Arrow/line gently bobs translateY ±4px, 2s cycle. Fades out after first scroll. |
| **Condition word shift** | Weather code changes | `timing` crossfade | Old label fades out, new fades in. |

**Files**: `src/screens/NowScreen.tsx`

---

### 2. AtmosphereScreen — Layer 01

| Animation | Trigger | Type | Details |
|-----------|---------|------|---------|
| **Header slide-in** | Scroll into view | `spring` | Title slides from translateY 20→0 + fade 0→1. Eyebrow leads by 60ms. |
| **Metric bars** | ✅ Already animated | Spring stagger | Keep as-is — works great. |
| **Extra row fade-up** | After bars finish | `stagger` + `spring` | Dew point + visibility cells fade up (translateY 15→0), 100ms stagger. |
| **UV marker slide** | Mount | `spring` | Marker dot slides from left:0% to actual position. Satisfying settle. |
| **Alert strip entrance** | When windGust > 30 | `spring` | Slides in from bottom (translateY 40→0) + slight scale 0.95→1. Attention-grabbing but not jarring. |
| **Updated time tick** | Every minute | `timing` crossfade | Time string fades out/in when it changes. Proves "this is live". |

**Files**: `src/screens/AtmosphereScreen.tsx`

---

### 3. HourlyScreen — Layer 02

| Animation | Trigger | Type | Details |
|-----------|---------|------|---------|
| **Tape items stagger** | Scroll into view | `stagger` + `spring` | Each hourly item fades in + slides up (translateY 20→0), 40ms stagger across 24 items. Creates a wave. |
| **NOW item pulse** | Mount | Looping `sequence` | First item's border gently pulses opacity, says "you are here". |
| **Precip bar grow** | After tape stagger | `spring` per bar | Each blue precip bar grows from height 0 to actual %, staggered left-to-right. Rain visualization. |
| **Wind ribbon entrance** | After tape | `spring` | Slides in from left (translateX -30→0) + fade. |
| **Wind value counter** | Data arrives | Counting anim | Wind speed counts up like NowScreen temp. |
| **Horizontal scroll hint** | Mount, once | `timing` | Tape auto-scrolls 60px right then back over 1.5s to hint "this scrolls". Then stops. |
| **Precip outlook typewriter** | After wind ribbon | `timing` | Text reveals character-by-character or word-by-word. Editorial feel. |

**Files**: `src/screens/HourlyScreen.tsx`

---

### 4. ForecastScreen — Layer 03

| Animation | Trigger | Type | Details |
|-----------|---------|------|---------|
| **Row stagger** | Scroll into view | `stagger` + `spring` | Each day row slides in from right (translateX 30→0) + fade, 80ms stagger. 7 rows = satisfying cascade. |
| **Temp bar grow** | After row appears | `spring` per row | Each temp range bar grows width from 0% to actual %, staggered with row entrance. |
| **Row press scale** | Touch | `spring` | On press: scale 0.97, on release: spring back to 1.0. Immediate feedback. |
| **Today row highlight** | Mount | Subtle pulse | "Today" row has a faint background pulse (opacity 0.02→0.06) to draw eye. |
| **Icon micro-bounce** | Row appears | `spring` with overshoot | Weather icon scales from 0.5→1.0 with slight bounce. 60ms after row entrance. |
| **Legend fade-in** | Mount | `timing` 300ms | Hi/Lo legend in header fades in after a beat. Not the focus. |

**Files**: `src/screens/ForecastScreen.tsx`

---

### 5. ScienceScreen — Layer 04

| Animation | Trigger | Type | Details |
|-----------|---------|------|---------|
| **Grid blocks stagger** | Scroll into view | `stagger` + `spring` | 4 blocks stagger in (translateY 25→0 + fade), 100ms apart. 2×2 grid: top-left → top-right → bottom-left → bottom-right. |
| **UV marker slide** | After grid entrance | `spring` | Same as Atmosphere — marker slides to position. |
| **Value counters** | Block appears | Counting anim | Each number counts up from 0. UV, pressure, wet-bulb, humidity all animate. |
| **Sun strip sunrise effect** | After grid | `timing` sequence | Sunrise value appears first, then sunset slides in from right, then daylight hours fades in last. Left-to-right like the sun moving. |
| **Daylight hours glow** | After sun strip | Looping `timing` | The golden daylight text gently pulses opacity (0.7→1.0), warm glow effect. |
| **Sub-text reveal** | After value settles | `timing` fade | Description text under each metric fades in 200ms after the number lands. Info arrives after impact. |

**Files**: `src/screens/ScienceScreen.tsx`

---

## Micro-Interactions (Global)

| Interaction | Where | Animation |
|-------------|-------|-----------|
| **Tap feedback** | All `TouchableOpacity` | Replace default opacity with `Animated.spring` scale 1→0.96→1, 150ms. Feels physical. |
| **Scroll velocity blur** | All layers | Very subtle: when scroll velocity is high, add 0.5px blur or slight opacity reduction. "Speed lines" feel. |
| **Data refresh pulse** | All screens | When new data arrives, a thin accent-colored line sweeps top-to-bottom across the screen (1px, 400ms). Confirms "data updated". |
| **Error shake** | Retry button | `sequence` of translateX [-8, 8, -4, 4, 0] over 400ms. Classic error shake. |
| **Loading skeleton** | All screens while loading | Shimmer/pulse placeholders in the shape of content. Better than spinner. |

---

## Implementation Priority

### Phase 1 — Biggest impact, least effort
1. **Dot nav spring animation** (App.tsx) — Makes navigation feel alive
2. **Row stagger in ForecastScreen** — Most visible dead screen
3. **Tape stagger in HourlyScreen** — Second most visible dead screen
4. **Grid stagger in ScienceScreen** — Completes the set
5. **Loading shimmer** (App.tsx) — First thing users see

### Phase 2 — Polish & delight
6. **Ink blob drift** (NowScreen) — Ambient life
7. **Live dot pulse** (NowScreen) — "It's live" signal
8. **UV marker slide** (Atmosphere + Science) — Satisfying detail
9. **Temp bar grow** (ForecastScreen) — Data visualization
10. **"Swipe to explore" bob** (NowScreen) — Onboarding hint

### Phase 3 — Premium feel
11. **Temp counter animation** (NowScreen) — Odometer effect
12. **Horizontal scroll hint** (HourlyScreen) — Discoverability
13. **Sun strip sunrise sequence** (ScienceScreen) — Storytelling
14. **Data refresh sweep line** (Global) — Live data confirmation
15. **Row press spring scale** (ForecastScreen) — Tactile feedback

---

## Technical Notes

- **Library**: Already using `react-native-reanimated` — use it for all scroll-linked and spring animations. Use RN `Animated` only for simple loops.
- **Native driver**: Use `useNativeDriver: true` wherever possible (transforms, opacity). Cannot use for width/height/layout — use reanimated `useAnimatedStyle` instead.
- **Performance**: Stagger animations should use `requestAnimationFrame` or reanimated worklets, not `setTimeout`.
- **Scroll-linked triggers**: Use `scrollY` shared value from App.tsx. Pass it down as a prop or via context. Each screen can derive its own `useAnimatedStyle` based on when its "page" enters the viewport.
- **Entry detection**: A layer is "entering" when `scrollY` is within `[layerIndex * SCREEN_HEIGHT - SCREEN_HEIGHT/2, layerIndex * SCREEN_HEIGHT + SCREEN_HEIGHT/2]`. Use `useDerivedValue` to compute per-layer visibility.

---

## Scroll-Linked Architecture

```
scrollY (shared value from App.tsx)
  ├── Dot nav animated styles (per dot)
  ├── Layer 0: NowScreen
  │     ├── parallax offset = interpolate(scrollY, [0, H], [0, -30])
  │     └── exit fade = interpolate(scrollY, [0, H*0.7], [1, 0])
  ├── Layer 1: AtmosphereScreen  
  │     ├── entry fade = interpolate(scrollY, [H*0.5, H], [0, 1])
  │     └── bars trigger when entry > 0.8
  ├── Layer 2: HourlyScreen
  │     ├── entry = interpolate(scrollY, [H*1.5, H*2], [0, 1])
  │     └── tape stagger trigger when entry > 0.8
  ... and so on
```

Pass `scrollY` as prop to each screen component. Each screen uses `useAnimatedStyle` or `useDerivedValue` to react.
