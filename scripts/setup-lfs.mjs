#!/usr/bin/env node
/**
 * setup-lfs.mjs — put the large .glb into Git LFS and get it ready to push.
 *
 *   node scripts/setup-lfs.mjs           # check, stage and commit the model
 *   node scripts/setup-lfs.mjs --check   # report only, change nothing
 *   node scripts/setup-lfs.mjs --push    # ...and push to the remote when done
 *
 * Everything it does is idempotent: run it again after replacing the model and
 * it commits the new version, or tells you there is nothing to do.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* The model the site loads on startup. Change this one line if you rename it. */
const MODEL = 'public/DFA-light.glb'

/* GitHub rejects a single LFS object above this on Free/Pro plans. */
const PLAN_FILE_CAP = 2 * 1024 ** 3
/* GitHub Free/Pro include this much LFS bandwidth and storage per month. */
const PLAN_MONTHLY = 10 * 1024 ** 3

const args = new Set(process.argv.slice(2))
const CHECK_ONLY = args.has('--check') || args.has('-n')
const DO_PUSH = args.has('--push')

/* ------------------------------------------------------------------ output */

const tty = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s)
const bold = (s) => paint('1', s)
const dim = (s) => paint('2', s)

let failed = false
const ok = (m) => console.log(`  ${paint('32', '✓')} ${m}`)
const info = (m) => console.log(`  ${paint('36', '·')} ${m}`)
const warn = (m) => console.log(`  ${paint('33', '!')} ${m}`)
const bad = (m) => { failed = true; console.log(`  ${paint('31', '✗')} ${m}`) }
const step = (m) => console.log(`\n${bold(m)}`)

function die(message, ...hints) {
  console.log(`\n${paint('31', bold('Stopped.'))} ${message}`)
  for (const h of hints) console.log(`  ${h}`)
  console.log('')
  process.exit(1)
}

const mb = (b) =>
  b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${(b / 1024 ** 2).toFixed(1)} MB`

/** Indent every line after the first, so quoted git output stays in its column. */
const indent = (s, pad = '      ') => s.replace(/\n/g, `\n${pad}`)

/* --------------------------------------------------------------------- git */

/** Run a command, capture output. Never throws. */
function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    ...opts,
  })
  return {
    code: r.status === null ? 1 : r.status,
    out: (r.stdout || '').trim(),
    err: (r.stderr || '').trim(),
    missing: r.error?.code === 'ENOENT',
  }
}

/** Run a command and stream it straight to the terminal (for slow pushes). */
function runLive(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit' })
  return r.status === null ? 1 : r.status
}

const git = (...a) => run('git', a)

/* ------------------------------------------------------------------- steps */

console.log(bold('\nGit LFS setup — pendant-vercel-site'))
console.log(dim(`  repo: ${ROOT}`))
if (CHECK_ONLY) console.log(dim('  mode: --check (nothing will be changed)'))

/* 1 -- a git repo, with a remote to push to ------------------------------- */

step('1. Repository')

if (git('rev-parse', '--is-inside-work-tree').out !== 'true') {
  die('This folder is not a git repository.',
      dim('Run `git init` first, or run this script from inside the repo.'))
}
ok('inside a git work tree')

const branch = git('rev-parse', '--abbrev-ref', 'HEAD').out || 'main'
info(`branch ${bold(branch)}`)

const remote = git('remote', 'get-url', 'origin')
if (remote.code !== 0) {
  warn('no `origin` remote yet — set one before pushing:')
  console.log(dim('      git remote add origin https://github.com/<you>/<repo>.git'))
} else {
  info(`origin ${remote.out}`)
}

/* 2 -- git-lfs present and initialised ------------------------------------ */

step('2. Git LFS')

const lfsVersion = git('lfs', 'version')
if (lfsVersion.missing || lfsVersion.code !== 0) {
  die('Git LFS is not installed.',
      'Install it, then run this script again:',
      dim('  Windows   winget install GitHub.GitLFS     (or: choco install git-lfs)'),
      dim('  macOS     brew install git-lfs'),
      dim('  Linux     sudo apt install git-lfs         (or your package manager)'),
      dim('  Any OS    https://git-lfs.com'))
}
ok(lfsVersion.out.split('\n')[0])

/* `git lfs install` writes the clean/smudge filters into the *user* gitconfig.
   Without it the filters named in .gitattributes are silently inert and the
   whole 309 MB blob goes into the repo itself, where GitHub will reject it. */
const filter = git('config', '--get', 'filter.lfs.clean')
if (filter.code !== 0 || !filter.out) {
  if (CHECK_ONLY) {
    bad('LFS filters are not installed in your git config')
  } else {
    const r = git('lfs', 'install')
    if (r.code !== 0) die('`git lfs install` failed.', dim(r.err || r.out))
    ok('installed the LFS clean/smudge filters')
  }
} else {
  ok('LFS filters are active in your git config')
}

/* 3 -- .gitattributes actually matches the model -------------------------- */

step('3. Tracking rules')

if (!existsSync(join(ROOT, '.gitattributes'))) {
  die('.gitattributes is missing.',
      dim('It should contain: *.glb filter=lfs diff=lfs merge=lfs -text'))
}

/* Ask git itself rather than grepping the file — this accounts for nested
   .gitattributes files and for rules that were added but written wrongly. */
const attrs = git('check-attr', 'filter', 'diff', 'merge', '--', MODEL).out
if (!/filter:\s*lfs/.test(attrs)) {
  die(`${MODEL} is not matched by an LFS rule in .gitattributes.`,
      dim('Add this line to .gitattributes:'),
      dim('  *.glb filter=lfs diff=lfs merge=lfs -text'),
      '',
      dim('git reported:'), dim(`  ${indent(attrs, '  ')}`))
}
ok(`${MODEL} resolves to filter=lfs`)

/* A leftover `public/*.glb` ignore rule would make `git add` a silent no-op.
   Note: only the bare form returns a usable exit code. With `-v`, git exits 0
   for *any* matching pattern including a negation such as `!public/x.glb`,
   which would report a re-included file as ignored. So decide on the bare
   call and use `-v` only to quote the offending rule back. */
if (git('check-ignore', '--', MODEL).code === 0) {
  die(`${MODEL} is being ignored by .gitignore, so it can never be committed.`,
      dim('Remove the rule that matches it, or negate it with a later'),
      dim(`\`!${MODEL}\` line. git reported:`),
      dim(`  ${git('check-ignore', '-v', '--', MODEL).out}`))
}
ok('not excluded by .gitignore')

/* 4 -- the model itself --------------------------------------------------- */

step('4. The model')

if (!existsSync(join(ROOT, MODEL))) {
  die(`${MODEL} does not exist.`,
      dim('Put the exported model there — the app loads /DFA-light.glb on startup.'))
}

const size = statSync(join(ROOT, MODEL)).size
info(`${MODEL} — ${bold(mb(size))}`)

if (size > PLAN_FILE_CAP) {
  die(`At ${mb(size)} this exceeds GitHub's 2 GB per-file LFS limit on Free/Pro.`,
      dim('Compress the model (Draco geometry + KTX2 textures) or host it elsewhere.'))
}
if (size > 100 * 1024 ** 2) {
  warn('over 100 MB — this file can only ever reach GitHub through LFS')
  warn(`every visitor downloads all ${mb(size)} before the viewer draws anything,`)
  console.log(`      and each Vercel build pulls it against your ${mb(PLAN_MONTHLY)}/month`)
  console.log(`      LFS bandwidth — roughly ${Math.floor(PLAN_MONTHLY / size)} builds before it runs out.`)
  console.log(dim('      Draco + KTX2 compression usually takes a model like this under 40 MB.'))
}

/* 5 -- has a plain (non-LFS) copy already been committed? ----------------- */

step('5. History')

const inHistory = git('log', '--all', '--format=%H', '-1', '--', MODEL).out
if (!inHistory) {
  ok('never committed before — nothing to migrate')
} else {
  /* If it is in history, check whether that stored blob is an LFS pointer or
     the real 309 MB. A real blob has to be rewritten out of history before
     GitHub will accept the push. */
  const blob = git('cat-file', '-p', `${inHistory}:${MODEL}`)
  if (blob.out.startsWith('version https://git-lfs.github.com/spec/v1')) {
    ok('already committed as an LFS pointer')
  } else {
    bad('a full-size copy is already in your git history')
    console.log(dim('      GitHub will reject the push until history is rewritten.'))

    /* `git lfs migrate` refuses to run against a dirty tree, so say so up
       front rather than letting her hit that error herself. */
    const dirty = git('status', '--porcelain').out
    if (dirty) {
      console.log(dim('      First commit or stash your current changes — migrate refuses'))
      console.log(dim('      to run on a dirty working copy:'))
      console.log(dim(`        ${indent(dirty.split('\n').slice(0, 5).join('\n'), '        ')}`))
      console.log(dim('        git stash -u        # or: git add -A && git commit'))
    }
    console.log(dim('      Then:'))
    console.log(dim('        git lfs migrate import --include="*.glb" --everything'))
    console.log(dim('      and re-run this script. (That rewrites commit hashes — if you'))
    console.log(dim('      have already pushed this branch you will need `git push --force`.)'))
  }
}

if (failed) {
  console.log(`\n${paint('31', bold('Fix the items marked ✗ above, then run this again.'))}\n`)
  process.exit(1)
}

/* 6 -- stage, verify, commit ---------------------------------------------- */

step('6. Stage and commit')

if (CHECK_ONLY) {
  info('--check: stopping before any changes')
  console.log('')
  process.exit(0)
}

/* .gitattributes must be staged *before* the model, or the clean filter that
   turns it into a pointer is not in effect when git reads the file. */
for (const p of ['.gitattributes', '.gitignore', 'scripts/setup-lfs.mjs']) {
  if (existsSync(join(ROOT, p))) git('add', '--', p)
}

const addModel = git('add', '--', MODEL)
if (addModel.code !== 0) die(`could not stage ${MODEL}.`, dim(addModel.err))

/* Prove the staged object is a ~130-byte pointer and not the whole model. */
const staged = git('cat-file', '-p', `:${MODEL}`)
if (!staged.out.startsWith('version https://git-lfs.github.com/spec/v1')) {
  die('The staged file is the raw model, not an LFS pointer.',
      dim('The clean filter did not run. Try:'),
      dim('  git lfs install'),
      dim(`  git rm --cached "${MODEL}"`),
      dim('  node scripts/setup-lfs.mjs'))
}
const oid = /oid sha256:([0-9a-f]+)/.exec(staged.out)?.[1] ?? '?'
ok(`staged as an LFS pointer (sha256 ${oid.slice(0, 12)}…)`)

const tracked = git('lfs', 'ls-files').out
if (tracked) console.log(dim(`      ${tracked.replace(/\n/g, '\n      ')}`))

const pending = git('diff', '--cached', '--name-only').out
if (!pending) {
  info('nothing new to commit — the repo is already up to date')
} else {
  console.log(dim(`      committing: ${pending.replace(/\n/g, ', ')}`))
  const msg = `Track ${MODEL} (${mb(size)}) with Git LFS`
  const c = git('commit', '-m', msg)
  if (c.code !== 0) die('commit failed.', dim(c.err || c.out))
  ok(`committed — ${dim(msg)}`)
}

/* 7 -- push --------------------------------------------------------------- */

step('7. Push')

if (!DO_PUSH) {
  info('not pushing (re-run with --push, or do it yourself):')
  console.log(dim(`      git push -u origin ${branch}`))
} else if (remote.code !== 0) {
  bad('no `origin` remote to push to')
  process.exit(1)
} else {
  console.log(dim(`      uploading ${mb(size)} to LFS — this takes a while.\n`))
  const code = runLive('git', ['push', '-u', 'origin', branch])
  if (code !== 0) {
    console.log(`\n  ${paint('31', '✗')} push failed — see git's output above.`)
    console.log(dim('      "exceeded data quota" means your LFS bandwidth is spent for the'))
    console.log(dim('      month; buy a data pack or host the model outside git.'))
    process.exit(1)
  }
  ok('pushed')
}

/* 8 -- Vercel ------------------------------------------------------------- */

step('One more thing — Vercel')
console.log(`  Vercel clones without LFS unless you turn it on, and a build that
  clones without it deploys a 130-byte pointer file in place of the model.
  The viewer then fails with ${dim('"could not read model"')}.

  ${bold('Project → Settings → Git → Git LFS → enable')}, then redeploy.
  It is free on every plan, but those fetches count against your GitHub
  LFS bandwidth, not Vercel's.
`)
