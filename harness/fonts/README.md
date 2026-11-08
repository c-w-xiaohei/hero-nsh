# Fonts

The screenshot comparison in the port SOP needs both sides to load the same font file: HeroUI's
`--font-sans` is the system stack, so the port picks an open-source font and names it in the theme.

- **Inter 4.1** by The Inter Project Authors, SIL Open Font License 1.1 (`OFL.txt`).
  Source: <https://github.com/rsms/inter/releases/tag/v4.1>, `web/Inter-*.woff2`.
- Weights: `Regular` 400, `Medium` 500, `SemiBold` 600, `Bold` 700, the weights HeroUI's CSS uses.
  The stock static files declare `Inter Medium` / `Inter SemiBold` as their typographic family;
  they were renamed to the single family `Inter` so NSH's `font-weight` selects each face.
- `theme/hero-nsh.theme.json` sets `font-sans` to `Inter, system-ui, sans-serif`.

`harness/App.tsx` imports the four files for their side effect, which registers them.
