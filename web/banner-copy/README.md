# web/banner-copy — evidence

Backs the PR "feat(web): align the landing copy with the brand banner" (branch
`web/banner-copy`, pegada-web wave 2, PR 5).

Everything here is a local production build: `next build` + `next start` on port
3311, main at 19b8d55 for the before shots, the branch for the after shots. Same
machine, same session. Playwright at DPR 2, animations frozen with a stylesheet
injected after load so `appearFromBottom` can't leave a frame half-drawn.

## The reference target

`banner-reference.png` is `.github/images/banner.png`, copied unchanged. It is
the reason this PR exists: the banner says **Friends For Your Doggie** over
**Pawfect Matches**, and the site said "Find a Match For Your Dog". The art wins.

## Strings

| key | before | after |
| --- | --- | --- |
| `en.home.title` | Find a Match For Your Dog | Friends For Your Doggie |
| `en.home.description` | Our algorithm ensures that your puppy finds the perfect match based on breed, location, and even personality! | Pawfect matches by breed and personality, close enough to walk to. |
| `pt-BR.home.title` | Dê um Match Pro Seu Dog | Amigos Pro Seu Dog |
| `pt-BR.home.description` | O algoritmo garante que seu cachorrinho encontre o par perfeito baseado na raça, localização e até mesmo personalidade! | Aqui do lado tem cachorro da mesma raça e com o mesmo jeito do seu. |

`metadata.title` and `metadata.description` are unchanged in both locales. So is
every Android surface and the "Android and iOS" wording in the store copy.

## H1 layout, measured not eyeballed

`h1Lines` is the element's rendered box height divided by its computed
line-height. The H1 is `text-6xl` (60px) `font-extrabold`; at 390px the text
column is 294px wide after the `p-12` gutters.

| locale | viewport | before | after |
| --- | --- | --- | --- |
| en | desktop 1440x900 | 2 lines, 480x120 | 2 lines, 480x120 |
| en | mobile 390x844 | 4 lines, 294x240 | **3 lines**, 294x180 |
| pt-BR | desktop 1440x900 | 2 lines, 480x120 | 2 lines, 480x120 |
| pt-BR | mobile 390x844 | 4 lines, 294x240 | **3 lines**, 294x180 |

Both locales got shorter on mobile. Nothing overflows, nothing hyphenates, no
word is wider than the column. `cta.tsx` is untouched — the 6xl size holds.

The longest single words are "Friends" (~206px) and "Doggie" (~195px) against a
294px column, so the wrap has ~30% headroom. Desktop breaks
`Friends For` / `Your Doggie`, which is the banner's own two-line lockup.

## pt-BR candidate matrix

`ptbr-candidate-matrix-mobile.png` and `ptbr-candidate-matrix-desktop.png` put
three renders side by side: current `main`, candidate A, candidate B.

- **A** keeps the live H1 "Dê um Match Pro Seu Dog".
- **B** moves to "Amigos Pro Seu Dog", the banner's friendship framing.

Both candidates carry the identical supporting line, so the matrix isolates the
H1 as the only variable. B is the one on the branch. Rationale is in the PR body.

Per-candidate full-size renders are in `screenshots/candidate-a--*` and
`screenshots/candidate-b--*` (candidate B is byte-identical to `after--pt-BR--*`).

## Files

- `banner-reference.png` — the brand art this PR aligns to.
- `en-before-after-mobile.png`, `en-before-after-desktop.png`,
  `ptbr-before-after-desktop.png` — labelled side-by-sides.
- `ptbr-candidate-matrix-mobile.png`, `ptbr-candidate-matrix-desktop.png` — the
  three-way pt-BR comparison.
- `screenshots/` — the raw frames, `<label>--<locale>--<viewport>.png`, DPR 2.
