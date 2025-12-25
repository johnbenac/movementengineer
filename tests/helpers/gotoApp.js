export async function gotoApp(page) {
  const entry = process.env.ME_E2E_ENTRY || '/';
  await page.goto(entry, { waitUntil: 'domcontentloaded' });
}
