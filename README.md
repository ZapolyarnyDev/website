# [zapolyarnydev.ru](https://zapolyarnydev.ru)

My personal website

## Stack

Astro, TypeScript, MDX, CSS, pnpm

> (Can my cat be considered part of the tech stack?)

## Development

Development and personal experimentation are permitted

```sh
pnpm install
pnpm dev
```

Or with [just](https://just.systems/): `just` lists recipes (`sync`, `dev`, `check`, `fmt`, `build`, `preview`, `new`, `devlog`).

New log entry (created as a draft in `content/log/`):

```sh
pnpm new devlog "Title" --project proxyvirtualizer
pnpm new lab|essay|note|case "Title" [--project <id>] [--lang en]
```

A devlog draft lists the project's commits from the last 7 days (`--days <n>`) as MDX comments.

## Backdrops

The looping 3D backgrounds are rendered in Blender (EEVEE) and live in `public/media/`, posters in `src/assets/redesign/bg/`.

```sh
blender -b --factory-startup -P scripts/render-hero.py -- --out render/hero
blender -b --factory-startup -P scripts/render-backdrop.py -- --scene log|projects --out render/<scene>
python scripts/glow-frames.py --frames render/<scene> --out render/<scene>-glow
blender -b --factory-startup -P scripts/encode-hero.py -- --frames render/<scene>-glow --out public/media/<scene>.webm --height 1080 --bitrate 3500
```

Encode `.webm` and `.mp4` at `--height 1080 --bitrate 3500` and `--height 720 --bitrate 1800` (saved as `<scene>-720.*`). `--frame N --scale 50` renders a single preview frame.

## License

[MIT](LICENSE)
