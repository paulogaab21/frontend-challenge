import type { Locator, Page } from '@playwright/test'
import { nftListResponseSchema } from '@/contracts'
import { formatEth } from '@/lib/money'
import { expect, type ApiHelpers } from '../fixtures'

export function market(page: Page): Locator {
  return page.getByRole('region', { name: 'Mercado de NFTs' })
}

export async function searchCatalog(page: Page, isMobile: boolean, query: string) {
  if (isMobile) {
    const field = page.getByRole('searchbox', { name: 'Explorar coleções' })
    await field.fill(query)
    await field.press('Enter')
  } else {
    await page.getByRole('button', { name: 'Buscar NFTs', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
    await dialog.getByRole('searchbox', { name: 'Termo de busca' }).fill(query)
    await dialog.getByRole('button', { name: 'Buscar', exact: true }).click()
  }
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(query)
}

export async function openFilters(page: Page, isMobile: boolean): Promise<Locator> {
  if (isMobile || (page.viewportSize()?.width ?? 1440) < 1024) {
    await page
      .getByRole('button', { name: isMobile ? 'Abrir filtros' : 'Filtros', exact: true })
      .click()
    return page.getByRole('dialog', { name: 'Filtros', exact: true })
  }
  return page.getByRole('complementary', { name: 'Filtros do catálogo' })
}

export async function closeFilters(page: Page, isMobile: boolean) {
  if (isMobile || (page.viewportSize()?.width ?? 1440) < 1024)
    await page
      .getByRole('dialog', { name: 'Filtros', exact: true })
      .getByRole('button', { name: 'Ver resultados' })
      .click()
}

export async function sortCatalog(page: Page, label: string) {
  await market(page).getByRole('combobox', { name: 'Ordenar por' }).click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

/** Translate the public route contract, independently of the application parser. */
export function catalogApiPath(url: string): string {
  const source = new URL(url).searchParams
  const target = new URLSearchParams()
  for (const [route, api] of Object.entries({
    q: 'q',
    categoria: 'category',
    rede: 'network',
    precoMin: 'priceMin',
    precoMax: 'priceMax',
    aba: 'tab',
    ordem: 'sort',
    pagina: 'page',
  }))
    for (const value of source.getAll(route)) target.append(api, value)
  return `/nfts?${target}`
}

export async function expectCatalog(
  page: Page,
  api: ApiHelpers,
  path = catalogApiPath(page.url()),
) {
  const response = await api.get(path)
  expect(response.status).toBe(200)
  const result = nftListResponseSchema.parse(response.body)
  const region = market(page)
  await expect(region.getByRole('heading', { level: 2 })).toHaveText(
    result.items.map((item) => item.name),
  )
  if (result.items.length > 0) {
    await expect(region.getByRole('status')).toContainText(`${result.totalItems} NFT`)
    if (result.totalPages > 1)
      await expect(region.getByRole('status')).toContainText(
        `página ${result.page} de ${result.totalPages}`,
      )
  }
  for (const item of result.items) {
    const card = region
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: item.name, exact: true }) })
    await expect(card.getByText(formatEth(item.price), { exact: false }).first()).toBeVisible()
    await expect(card.getByRole('link').first()).toHaveAttribute('href', `/nft/${item.id}`)
  }
  return result
}
