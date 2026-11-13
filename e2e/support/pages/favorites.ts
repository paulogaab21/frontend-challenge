import type { Page } from '@playwright/test'
import { favoritesResponseSchema } from '@/contracts'
import { expect, type ApiHelpers } from '../fixtures'

export async function expectFavorites(page: Page, api: ApiHelpers) {
  await expect(page.getByRole('heading', { level: 1, name: 'Lista de interesse', exact: true })).toBeVisible()
  const response = await api.get('/favorites')
  expect(response.status).toBe(200)
  const favorites = favoritesResponseSchema.parse(response.body)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Lista de interesse', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('main').getByRole('article').getByRole('heading')).toHaveText(
    favorites.items.map((item) => item.name),
  )
  for (const item of favorites.items)
    await expect(
      page.getByRole('button', { name: `Remover dos favoritos: ${item.name}`, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
  return favorites
}

export async function toggleCardFavorite(page: Page, name: string, favorite: boolean) {
  const card = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .first()
  await card.hover()
  await card
    .getByRole('button', {
      name: `${favorite ? 'Favoritar' : 'Remover dos favoritos'}: ${name}`,
      exact: true,
    })
    .click()
}
