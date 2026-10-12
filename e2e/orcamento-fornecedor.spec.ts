import { expect, test, type Page } from "@playwright/test";

/** Usa usuários do seed. Rode após `npm run db:reset`. */
const SENHA = "induxhub123";

async function login(page: Page, slug: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(`${slug}@induxhub.test`);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(`**${next}`);
}

async function fillItem(page: Page, index: number, item: { descricao: string; qtd: string; unidade: string; valor: string }) {
  await page.locator(`[id="itens.${index}.descricao"]`).fill(item.descricao);
  await page.locator(`[id="itens.${index}.quantidade"]`).fill(item.qtd);
  await page.locator(`[id="itens.${index}.unidade"]`).selectOption(item.unidade);
  await page.locator(`[id="itens.${index}.valorUnitario"]`).fill(item.valor);
}

test.describe.serial("orçamento do fornecedor", () => {
  let publicPath = "";

  test("fornecedor monta orçamento avulso e envia", async ({ page }) => {
    await login(page, "solda-forte-salto", "/painel/propostas");
    await expect(page.getByText("Nenhum orçamento ainda")).toBeVisible();

    await page.getByRole("link", { name: "Novo orçamento" }).click();
    await page.getByLabel("Nome ou empresa").fill("Fazenda Boa Vista");
    await page.getByLabel("WhatsApp").fill("(15) 99876-5432");
    await page.getByLabel("Título do orçamento").fill("Portão industrial em aço");

    await fillItem(page, 0, { descricao: "Estrutura metálica", qtd: "120", unidade: "kg", valor: "18,50" });
    await page.getByRole("button", { name: "Adicionar item" }).click();
    await fillItem(page, 1, { descricao: "Mão de obra de solda", qtd: "16", unidade: "h", valor: "95" });
    await page.getByLabel("Desconto (R$)").fill("100");
    await page.getByLabel("Frete (R$)").fill("80");

    // 120 × 18,50 + 16 × 95 = 3.740,00; − 100 + 80 = 3.720,00
    await expect(page.getByText("R$ 3.720,00")).toBeVisible();

    await page.getByLabel("Pagamento").fill("50% no pedido, 50% na entrega");
    await page.getByRole("button", { name: "Enviar orçamento" }).click();

    await page.waitForURL(/\/painel\/propostas\/[0-9a-f-]+\?enviado=1/);
    await expect(page.getByText("Orçamento enviado. Mande o link")).toBeVisible();
    await expect(page.getByText(/ORC-\d{4}-0001/)).toBeVisible();

    const whatsapp = await page.getByRole("link", { name: "Enviar pelo WhatsApp" }).getAttribute("href");
    expect(whatsapp).toContain("wa.me/5515998765432");

    const pdf = await page.getByRole("link", { name: "Baixar PDF" }).getAttribute("href");
    publicPath = new URL(pdf!).pathname.replace(/\/pdf$/, "");
    expect(publicPath).toMatch(/^\/p\/[0-9a-f-]{36}$/);
  });

  test("cliente sem conta abre o link, baixa o PDF e aceita", async ({ page, request }) => {
    await page.goto(publicPath);
    await expect(page.getByRole("heading", { name: "Portão industrial em aço" })).toBeVisible();
    await expect(page.getByText("Para Fazenda Boa Vista")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Mão de obra de solda" })).toBeVisible();

    const pdf = await request.get(`${publicPath}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

    await page.getByRole("button", { name: "Aceitar orçamento" }).click();
    await page.getByRole("button", { name: "Confirmar aceite" }).click();
    await expect(page.getByText(/Orçamento aceito em/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Aceitar orçamento" })).toHaveCount(0);
  });

  test("fornecedor vê o aceite e cria nova versão de outro orçamento", async ({ page }) => {
    await login(page, "solda-forte-salto", "/painel/propostas");
    await expect(page.getByText("Aceito", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: /Portão industrial em aço/ }).click();
    await expect(page.getByText("Fazenda Boa Vista aceitou este orçamento.")).toBeVisible();

    // Duplicar gera rascunho com os mesmos itens.
    await page.getByRole("button", { name: "Duplicar" }).click();
    await page.waitForURL(/\/painel\/propostas\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: "Rascunho" })).toBeVisible();
    await expect(page.locator('[id="itens.1.descricao"]')).toHaveValue("Mão de obra de solda");
    await page.getByRole("button", { name: "Descartar rascunho" }).click();
    await page.getByRole("button", { name: "Descartar", exact: true }).click();
    await page.waitForURL("**/painel/propostas");
  });

  test("fornecedor responde pedido do marketplace com orçamento", async ({ page }) => {
    await login(page, "caldeiraria-porto-feliz", "/painel/orcamentos");
    await page.getByRole("link", { name: /Solda de reparo em chassi de implemento/ }).click();
    await page.getByRole("link", { name: "Montar orçamento" }).click();

    await expect(page.getByText(/Resposta ao pedido/)).toBeVisible();
    await fillItem(page, 0, { descricao: "Solda MIG com inspeção", qtd: "1", unidade: "servico", valor: "2.400,00" });
    await page.getByLabel("Prazo de entrega (dias)").fill("5");
    await page.getByRole("button", { name: "Enviar orçamento" }).click();
    await page.waitForURL(/\?enviado=1/);
    await expect(page.getByText("O solicitante já vê no pedido.")).toBeVisible();
  });

  test("solicitante compara, abre o orçamento completo e aceita", async ({ page }) => {
    await login(page, "agromaq-boituva", "/orcamentos");
    await page.getByRole("link", { name: /Solda de reparo em chassi de implemento/ }).click();
    await expect(page.getByText("R$ 2.400,00")).toBeVisible();
    await page.getByRole("link", { name: "Ver orçamento completo" }).click();

    await expect(page.getByRole("cell", { name: "Solda MIG com inspeção" })).toBeVisible();
    await page.getByRole("button", { name: "Aceitar orçamento" }).click();
    await page.getByRole("button", { name: "Confirmar aceite" }).click();
    await expect(page.getByText(/Orçamento aceito em/)).toBeVisible();

    await page.goBack();
    await page.reload();
    await expect(page.getByText("Escolhido")).toBeVisible();
  });
});
