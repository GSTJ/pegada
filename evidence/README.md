# PR #158 proof videos

Dog profile hero transition (card <-> profile photo morph), captured on the iOS Simulator (iPhone 17 Pro, iOS 26.1) against a local backend seeded via `maestro:seed`.

- `pr158-hero-morph-light.mp4` - light mode, forward (Swipe -> Profile) and reverse (Profile -> Swipe) transitions.
- `pr158-hero-morph-dark.mp4` - dark mode, same forward/reverse flow. This is the one that actually proves the white-flash fix: light mode's background is white already, so a stray white paint would be invisible there.
- `pr158-hero-morph-reduced-motion.mp4` - Reduce Motion enabled in the simulator's accessibility settings; the manual photo morph is skipped entirely and it falls back to the stack's plain screen fade.
