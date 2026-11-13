import { spawn, execFileSync } from 'node:child_process'
import { access, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { chromium } from '@playwright/test'
import { killAll, launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'

import { lighthouseConfig, pages, profiles, thresholds } from './config.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const reports = path.join(root, 'lighthouse/reports')
const require = createRequire(import.meta.url)
const children = new Set()
const stopped = new WeakMap()
const killed = new WeakMap()
const abort = new AbortController()
let pendingChrome
let activeChrome
let summary

function stopChild(child) {
  if (stopped.has(child)) return stopped.get(child)
  const promise = (async () => {
    if (child.exitCode !== null || child.signalCode !== null) return
    if (process.platform === 'win32') {
      await new Promise((resolve) => {
        const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        })
        killer.once('error', resolve)
        killer.once('close', resolve)
      })
    } else {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch (error) {
        if (error.code !== 'ESRCH') throw error
      }
    }
  })()
  stopped.set(child, promise)
  return promise
}

function killChrome(chrome) {
  if (!killed.has(chrome))
    killed.set(
      chrome,
      (async () => {
        const child = chrome.process
        // The launcher wrapper returns void from kill(). Wait for process close so
        // its temporary-profile cleanup also runs before a signal handler exits.
        const closed =
          child && child.exitCode === null && child.signalCode === null
            ? new Promise((resolve) => child.once('close', resolve))
            : Promise.resolve()
        await chrome.kill()
        await closed
      })(),
    )
  return killed.get(chrome)
}

async function cleanup() {
  const chrome = activeChrome ?? (await pendingChrome?.catch(() => undefined))
  const results = await Promise.allSettled([
    ...(chrome ? [killChrome(chrome)] : []),
    ...[...children].map(stopChild),
  ])
  for (const result of results) {
    if (result.status === 'rejected') console.error('Cleanup:', result.reason.message)
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    abort.abort()
    console.error(`\n${signal}: stopping audit Chrome and preview processes.`)
    void cleanup().finally(() => process.exit(signal === 'SIGINT' ? 130 : 143))
  })
}

function startNode(args, options = {}) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    windowsHide: true,
    detached: process.platform !== 'win32',
    ...options,
  })
  children.add(child)
  child.once('close', () => children.delete(child))
  return child
}

async function build() {
  const npmCli = process.env.npm_execpath
  if (!npmCli) throw new Error('Run --build through npm: npm run lighthouse -- --build')
  console.log('Building production demo (MSW enabled, default scenario)...')
  await new Promise((resolve, reject) => {
    const child = startNode([npmCli, 'run', 'build'], {
      stdio: 'inherit',
      env: { ...process.env, VITE_ENABLE_MOCKS: 'true', VITE_MOCK_SCENARIO: 'default' },
    })
    child.once('error', reject)
    child.once('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`Build exited ${code}`)),
    )
  })
}

async function freePort(preferred = 4173) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', (error) => {
      if (preferred && error.code === 'EADDRINUSE') resolve(freePort(0))
      else reject(error)
    })
    server.listen(preferred, '127.0.0.1', () => {
      const port = server.address().port
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })
}

async function startPreview() {
  await access(path.join(root, 'dist/index.html')).catch(() => {
    throw new Error(
      'No optimized build. Run npm run lighthouse -- --build (or npm run build first).',
    )
  })
  const port = await freePort()
  let output = ''
  let failure
  const child = startNode(
    [
      path.join(root, 'node_modules/vite/bin/vite.js'),
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const capture = (chunk) => {
    output = (output + chunk).slice(-8000)
  }
  child.stdout.on('data', capture)
  child.stderr.on('data', capture)
  child.once('error', (error) => {
    failure = error
  })
  const base = `http://127.0.0.1:${port}`
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    abort.signal.throwIfAborted()
    if (failure || child.exitCode !== null)
      throw new Error(`Preview failed: ${failure?.message ?? output}`)
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(1000) })
      await response.body?.cancel()
      if (response.ok) return base
    } catch {
      /* Preview may still be opening its socket. */
    }
    await delay(250, undefined, { signal: abort.signal })
  }
  throw new Error(`Preview did not answer in 30 seconds: ${output}`)
}

async function warmUp(chrome, base) {
  // Reuse the launched Chrome's default context; disconnect Playwright before LH connects.
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`)
  const context = browser.contexts()[0]
  const page = await context.newPage()
  try {
    await page.goto(`${base}/`, { waitUntil: 'load', timeout: 45_000 })
    await page.waitForFunction(
      () => document.querySelector('#root')?.childElementCount > 0,
      undefined,
      {
        timeout: 30_000,
      },
    )
    // Allow async startup/registration after React mounts; no measurements include this wait.
    await page.waitForTimeout(1000)
    const registrations = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return []
      return (await navigator.serviceWorker.getRegistrations()).map((registration) => ({
        scope: registration.scope,
        scriptURL: (registration.active ?? registration.installing ?? registration.waiting)
          ?.scriptURL,
      }))
    })
    if (registrations.length) {
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, {
        timeout: 20_000,
      })
    }
    const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller))
    const session = await context.newCDPSession(page)
    await session.send('Network.enable')
    await session.send('Network.clearBrowserCache')
    await session.detach()
    return {
      url: `${base}/`,
      controlled,
      registrations,
      httpCacheCleared: true,
      warning: controlled
        ? null
        : 'No controlling service worker. Scaffold may not boot MSW yet; verify demo initialization before final scoring.',
    }
  } finally {
    // Keep the warm-up client alive: MSW unregisters itself when its last client closes.
    // Chrome teardown closes it after Lighthouse finishes measuring a separate tab.
    await browser.close() // CDP-connected browser: disconnects, does not kill launched Chrome.
  }
}

function median(values) {
  const sorted = values.filter(Number.isFinite).toSorted((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function aggregate(runs, expected) {
  const scores = {}
  for (const [category, target] of Object.entries(thresholds)) {
    const values = runs.map((run) => run.scores?.[category] ?? null)
    const value = median(values)
    scores[category] = {
      values,
      median: value,
      target,
      pass: values.length === expected && values.every(Number.isFinite) && value >= target,
    }
  }
  const metrics = Object.fromEntries(
    ['lcp', 'cls', 'tbt'].map((metric) => {
      const values = runs.map((run) => run.metrics?.[metric] ?? null)
      return [
        metric,
        { values, median: median(values), unit: metric === 'cls' ? 'unitless' : 'ms' },
      ]
    }),
  )
  return {
    scores,
    metrics,
    pass: runs.every((run) => !run.error) && Object.values(scores).every((score) => score.pass),
  }
}

async function packageVersion(name) {
  return JSON.parse(await readFile(require.resolve(`${name}/package.json`), 'utf8')).version
}

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim()
  } catch {
    return 'unavailable'
  }
}

function display(value, places = 1) {
  return Number.isFinite(value) ? Number(value.toFixed(places)).toString() : 'N/A'
}

function markdown(data) {
  const lines = [
    '# Kurio Lighthouse audit',
    '',
    `Date (UTC): ${data.date}. Source commit: \`${data.git.commit}\` (${data.git.branch}; dirty: ${data.git.dirty}).`,
    '',
    `Command: \`${data.command}\``,
    '',
    `Base URL: ${data.baseUrl ?? 'not started'}. Runs per page/profile: ${data.runsRequested}. Overall: **${data.pass ? 'PASS' : 'FAIL'}**.`,
    '',
    'Scores are on a 0–100 scale; assertions use unrounded medians. LCP/TBT are milliseconds; CLS is unitless.',
    '',
    `| Profile | Page | Performance ≥${thresholds.performance} | Accessibility ≥${thresholds.accessibility} | Best Practices ≥${thresholds['best-practices']} | SEO ≥${thresholds.seo} | LCP ms | CLS | TBT ms | Result |`,
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ]
  for (const group of data.results) {
    const scoreCells = Object.keys(thresholds).map((key) => {
      const score = group.aggregate.scores[key]
      return `${display(score.median)} ${score.pass ? 'PASS' : 'FAIL'}`
    })
    const metrics = group.aggregate.metrics
    lines.push(
      `| ${group.profile} | ${group.page.title} | ${scoreCells.join(' | ')} | ${display(metrics.lcp.median)} | ${display(metrics.cls.median, 4)} | ${display(metrics.tbt.median)} | ${group.aggregate.pass ? 'PASS' : 'FAIL'} |`,
    )
  }
  lines.push(
    '',
    '## Per-run values',
    '',
    '| Profile / page | Run | Performance | Accessibility | Best Practices | SEO | LCP ms | CLS | TBT ms | MSW controls warm-up |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  )
  for (const group of data.results) {
    for (const run of group.runs) {
      const scores = Object.keys(thresholds).map((key) => display(run.scores?.[key]))
      lines.push(
        `| ${group.profile} / ${group.page.slug} | [${run.number}](./${group.profile}/${group.page.slug}/run-${run.number}.report.html) | ${scores.join(' | ')} | ${display(run.metrics?.lcp)} | ${display(run.metrics?.cls, 4)} | ${display(run.metrics?.tbt)} | ${run.warmUp?.controlled ?? 'N/A'} |`,
      )
    }
  }
  lines.push(
    '',
    '## Environment and conditions',
    '',
    '```json',
    JSON.stringify(
      {
        versions: data.versions,
        environment: data.environment,
        conditions: data.conditions,
      },
      null,
      2,
    ),
    '```',
    '',
    '## Warnings / errors',
    '',
  )
  const warnings = new Set(data.error ? [data.error] : [])
  for (const group of data.results)
    for (const run of group.runs) {
      if (run.error) warnings.add(`${group.profile}/${group.page.slug}/${run.number}: ${run.error}`)
      if (run.warmUp?.warning) warnings.add(run.warmUp.warning)
      for (const warning of run.warnings ?? [])
        warnings.add(typeof warning === 'string' ? warning : JSON.stringify(warning))
    }
  lines.push(...(warnings.size ? [...warnings].map((warning) => `- ${warning}`) : ['None.']), '')
  return lines.join('\n')
}

async function saveSummary() {
  summary.pass =
    !summary.error &&
    summary.results.length === summary.groupsExpected &&
    summary.results.every((group) => group.aggregate.pass)
  await mkdir(reports, { recursive: true })
  await writeFile(path.join(reports, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  await writeFile(path.join(reports, 'SUMMARY.md'), markdown(summary))
}

async function measure(base, profile, page, number) {
  const run = { number, scores: null, metrics: null, error: null }
  console.log(`${profile} / ${page.slug} / run ${number}`)
  try {
    abort.signal.throwIfAborted()
    // No userDataDir: chrome-launcher creates and deletes a fresh temporary profile per run.
    pendingChrome = launch({
      chromeFlags: ['--headless=new'],
      handleSIGINT: false,
      logLevel: 'error',
    }).catch((error) => {
      // launch() registers a Launcher before waiting for its debugger socket.
      // A startup rejection can therefore leave a partial Chrome process behind.
      for (const cleanupError of killAll()) console.error('Chrome startup cleanup:', cleanupError)
      throw error
    })
    activeChrome = await pendingChrome
    const versionResponse = await fetch(`http://127.0.0.1:${activeChrome.port}/json/version`, {
      signal: AbortSignal.timeout(5000),
    })
    const version = await versionResponse.json()
    run.chromeVersion = version.Browser
    if (!summary.versions.chrome.includes(version.Browser))
      summary.versions.chrome.push(version.Browser)
    run.warmUp = await warmUp(activeChrome, base)
    if (run.warmUp.warning) console.warn(run.warmUp.warning)
    const result = await lighthouse(
      `${base}${page.path}`,
      {
        port: activeChrome.port,
        output: ['html', 'json'],
        logLevel: 'error',
      },
      lighthouseConfig(profile),
    )
    if (!result?.lhr) throw new Error('Lighthouse returned no result')
    const { lhr } = result
    const directory = path.join(reports, profile, page.slug)
    await mkdir(directory, { recursive: true })
    const html = Array.isArray(result.report) ? result.report[0] : result.report
    await writeFile(path.join(directory, `run-${number}.report.html`), html)
    await writeFile(
      path.join(directory, `run-${number}.report.json`),
      `${JSON.stringify(lhr, null, 2)}\n`,
    )
    run.date = lhr.fetchTime
    run.lighthouseVersion = lhr.lighthouseVersion
    run.environment = lhr.environment
    run.settings = lhr.configSettings
    run.warnings = lhr.runWarnings
    run.scores = Object.fromEntries(
      Object.keys(thresholds).map((key) => [
        key,
        Number.isFinite(lhr.categories[key]?.score) ? lhr.categories[key].score * 100 : null,
      ]),
    )
    run.metrics = Object.fromEntries(
      Object.entries({
        lcp: 'largest-contentful-paint',
        cls: 'cumulative-layout-shift',
        tbt: 'total-blocking-time',
      }).map(([key, audit]) => [key, lhr.audits[audit]?.numericValue ?? null]),
    )
    if (lhr.runtimeError) run.error = `${lhr.runtimeError.code}: ${lhr.runtimeError.message}`
    console.log(`  scores: ${JSON.stringify(run.scores)}; metrics: ${JSON.stringify(run.metrics)}`)
  } catch (error) {
    run.error = error.stack ?? error.message
    console.error(run.error)
  } finally {
    if (activeChrome) await killChrome(activeChrome)
    activeChrome = undefined
    pendingChrome = undefined
  }
  return run
}

async function main() {
  const { values } = parseArgs({
    options: {
      runs: { type: 'string', default: '3' },
      only: { type: 'string' },
      page: { type: 'string' },
      url: { type: 'string' },
      build: { type: 'boolean', default: false },
      'no-assert': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
    allowPositionals: false,
  })
  if (values.help) {
    console.log(
      'npm run lighthouse -- [--build] [--runs <n>] [--only mobile|desktop] [--page home|nft-detail] [--url <base>] [--no-assert]',
    )
    return
  }
  if (
    !/^\d+$/.test(values.runs) ||
    !Number.isSafeInteger(Number(values.runs)) ||
    Number(values.runs) < 1
  ) {
    throw new Error('--runs must be a positive integer')
  }
  if (values.only && !Object.hasOwn(profiles, values.only))
    throw new Error('--only must be mobile or desktop')
  if (values.page && !pages.some((page) => page.slug === values.page))
    throw new Error('Unknown --page slug; see lighthouse/config.mjs')
  let base
  if (values.url) {
    const url = new URL(values.url)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('--url requires an http(s) base URL without credentials, query or fragment')
    }
    base = url.href.replace(/\/$/, '')
  }
  const count = Number(values.runs)
  const selectedProfiles = values.only ? [values.only] : Object.keys(profiles)
  const selectedPages = values.page ? pages.filter((page) => page.slug === values.page) : pages
  summary = {
    date: new Date().toISOString(),
    command: `npm run lighthouse${process.argv.length > 2 ? ` -- ${process.argv.slice(2).join(' ')}` : ''}`,
    git: {
      commit: git('rev-parse', 'HEAD'),
      branch: git('branch', '--show-current'),
      dirty: Boolean(git('status', '--porcelain')),
    },
    runsRequested: count,
    groupsExpected: selectedPages.length * selectedProfiles.length,
    baseUrl: base,
    pass: false,
    error: null,
    versions: {
      lighthouse: await packageVersion('lighthouse'),
      chromeLauncher: await packageVersion('chrome-launcher'),
      playwright: await packageVersion('@playwright/test'),
      vite: await packageVersion('vite'),
      node: process.version,
      chrome: [],
    },
    environment: {
      os: `${os.type()} ${os.release()} ${os.arch()}`,
      platform: process.platform,
      cpu: os.cpus()[0]?.model,
      logicalCores: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
    },
    conditions: {
      buildRequested: values.build,
      server: values.url
        ? 'external (caller responsible for optimized build and default mocks)'
        : 'local Vite preview; dist must be a production demo build',
      scenario: 'default',
      freshChromeProfilePerRun: true,
      warmUp:
        'One home navigation per fresh profile; wait for registered service worker control, then clear HTTP cache',
      storageReset: 'disabled to retain MSW registration; no profile reused across runs',
      profiles: Object.fromEntries(
        selectedProfiles.map((profile) => [profile, lighthouseConfig(profile).settings]),
      ),
      thresholds,
      assertionsEnabled: !values['no-assert'],
    },
    results: [],
  }
  try {
    if (values.build) await build()
    base ??= await startPreview()
    summary.baseUrl = base
    for (const profile of selectedProfiles)
      for (const page of selectedPages) {
        const directory = path.join(reports, profile, page.slug)
        await mkdir(directory, { recursive: true })
        // Remove only this selected group's old run files, including surplus runs from a previous invocation.
        for (const filename of await readdir(directory)) {
          if (/^run-\d+\.report\.(html|json)$/.test(filename))
            await unlink(path.join(directory, filename))
        }
        const group = { profile, page, runs: [], aggregate: aggregate([], count) }
        summary.results.push(group)
        for (let number = 1; number <= count; number++) {
          group.runs.push(await measure(base, profile, page, number))
          group.aggregate = aggregate(group.runs, count)
          await saveSummary()
        }
      }
  } catch (error) {
    summary.error = error.stack ?? error.message
    throw error
  } finally {
    await cleanup()
    await saveSummary()
  }
  const operationalFailure =
    summary.error || summary.results.some((group) => group.runs.some((run) => run.error))
  console.log(`\n${summary.pass ? 'PASS' : 'FAIL'} — ${path.join(reports, 'SUMMARY.md')}`)
  // --no-assert suppresses score failures only, never a broken build/browser/audit.
  if (operationalFailure || (!summary.pass && !values['no-assert'])) process.exitCode = 1
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
