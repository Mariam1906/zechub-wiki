import { test, expect } from '@playwright/test';

const BASE = process.env.TOOLS_BASE_URL ?? 'http://localhost:3000';

// Public test vectors; never paste private keys.
// https://github.com/ZecHub/zechub/blob/main/site/guides/Visualizing_Zcash_Addresses.md
const TRANSPARENT = 't1goiSyw2JinFCmUnfiwwp72LEZzD42TyYu';
// https://github.com/LEONINE-DAO/Nozy-wallet/blob/master/docs/reference/IRONWOOD_WALLET_READINESS.md
const TESTNET_ORCHARD = 'utest1jha9q2fwxjug08svdhza6jgmvvfdqyujqes80kj2gpmjsytcltjsslzpjj5gy8z2958yhdlqn4568jeu5d9fec6yme4rh3g4lqvvkjh8';
// Public example UAs — checked at runtime with the actual WASM validator.
const ORCHARD_ONLY = 'u1cysntkxwt0h4sahp7rhj7u27pgc2ga7685ekf65g0d5ht5glkfm4zkumhvkd2zg2pdrgv3mrwq2x3vw2yl5u7zef3cr2nqwrzu7v2dsa';
const MIXED = 'u1yvwppp7ann6n3pgkysdu0spvr50w4jf4jwgme3c8x8fp4av59rupgvdd3fddc3f2cwrk3ghs5lxt87ggj8cvjuzcrf4jkejwlu9pc83gk2vtx03ucqcc3ed0furcuypqs6d6swu3nws';
const PANEL = 'Address network, privacy classification and receiving guidance';

test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE}/tools?tool=address-decoder`);
  await expect(page.getByText('WASM decoder ready')).toBeVisible();
});

test('transparent address is marked mainnet, public and warned', async ({ page }) => {
  await page.getByPlaceholder(/Paste any Zcash address/).fill(TRANSPARENT);
  await expect(page.getByRole('region', { name: PANEL })).toContainText('Mainnet');
  await expect(page.getByRole('region', { name: PANEL })).toContainText('Transparent-only');
  await expect(page.getByRole('alert')).toContainText('Transparent receiver present');
});

test('Orchard-only UA explains NU6.3 receiving', async ({ page }) => {
  await page.getByPlaceholder(/Paste any Zcash address/).fill(ORCHARD_ONLY);
  await expect(page.getByRole('region', { name: PANEL })).toContainText('Shielded-only');
  await expect(page.getByRole('region', { name: PANEL })).toContainText('Ironwood');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('testnet UA is not mislabeled mainnet', async ({ page }) => {
  await page.getByPlaceholder(/Paste any Zcash address/).fill(TESTNET_ORCHARD);
  await expect(page.getByRole('region', { name: PANEL })).toContainText('Testnet');
  await expect(page.getByRole('region', { name: PANEL })).toContainText('Shielded-only');
});

test('mixed UA warns when transparent receiver is offered', async ({ page }) => {
  await page.getByPlaceholder(/Paste any Zcash address/).fill(MIXED);
  await expect(page.getByRole('region', { name: PANEL })).toContainText('Mixed (shielded + transparent)');
  await expect(page.getByRole('alert')).toContainText('Transparent receiver present');
});

test('invalid address cannot obtain privacy classification', async ({ page }) => {
  await page.getByPlaceholder(/Paste any Zcash address/).fill('u1invalid-checksum');
  await expect(page.getByText('Not a valid Zcash address')).toBeVisible();
  await expect(page.getByRole('region', { name: PANEL })).toHaveCount(0);
});

test('clearing input clears earlier classification and warnings', async ({ page }) => {
  const input = page.getByPlaceholder(/Paste any Zcash address/);
  await input.fill(TRANSPARENT);
  await expect(page.getByRole('alert')).toContainText('Transparent receiver present');
  await input.clear();
  await expect(page.getByRole('region', { name: PANEL })).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
