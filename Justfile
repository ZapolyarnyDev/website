set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

default:
    just --list

# Environment and quality
sync:
    pnpm install --frozen-lockfile

check:
    pnpm run check

fmt:
    pnpm run lint:fix
    pnpm run format

# Site
dev:
    pnpm run dev --host 127.0.0.1 --port 4321

build:
    pnpm run build

preview: build
    pnpm run preview --host 127.0.0.1 --port 4321

# Writing
new type title *args:
    pnpm run new {{type}} "{{title}}" {{args}}

devlog project title *args:
    pnpm run new devlog "{{title}}" --project {{project}} {{args}}
