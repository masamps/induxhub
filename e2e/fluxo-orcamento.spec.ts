import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

/** CNPJ válido aleatório (mesma regra do banco). */
function randomCnpj() {
  const base = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("") + "0001";
  const digit = (digits: string, weights: number[]) => {
    const rest = weights.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0) % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = digit(base, w1);
  return `${base}${d1}${digit(`${base}${d1}`, [6, ...w1])}`;
}

const run = Date.now().toString(36);
const prestador = {
  nome: "Paula Prestadora",
  email: `prestador-${run}@e2e.test`,
  senha: "senha-forte-123",
  empresa: `Torno Fino ${run}`,
};
const contratante = {
  nome: "Carlos Comprador",
  email: `contratante-${run}@e2e.test`,
  senha: "senha-forte-456",
  empresa: `Metal Compra ${run}`,
};
const titulo = `Usinagem de flanges ${run}`;
let quoteUrl = "";

async function fillEmpresa(page: Page, empresa: string) {
  await page.getByLabel("CNPJ").fill(randomCnpj());
  await page.getByLabel("Razão social").fill(`${empresa} Ltda`);
  await page.getByLabel("Nome fantasia").fill(empresa);
  await page.getByLabel("Cidade da sede").selectOption({ label: "Sorocaba" });
  await page.getByLabel("WhatsApp").fill("15991234567");
  await page.getByRole("button", { name: "Continuar" }).click();
}

async function login(page: Page, email: string, senha: string, next = "/painel") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(`**${next}`);
}

test.describe.serial("fluxo de orçamento", () => {
  test("área logada exige login", async ({ page }) => {
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/login\?next=%2Fpainel/);
    await page.getByLabel("E-mail").fill("ninguem@e2e.test");
    await page.getByLabel("Senha", { exact: true }).fill("errada123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos" })).toBeVisible();
  });

  test("prestador se cadastra em etapas e completa o perfil", async ({ page }) => {
    await page.goto("/cadastro");
    await page.getByRole("link", { name: /Ofereço serviços/ }).click();

    await expect(page.getByText("Etapa 1 de 5")).toBeVisible();
    await page.getByLabel("Seu nome").fill(prestador.nome);
    await page.getByLabel("E-mail").fill(prestador.email);
    await page.getByLabel("Senha", { exact: true }).fill(prestador.senha);
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page.getByText("Etapa 2 de 5")).toBeVisible();
    // Validação do CNPJ no cliente.
    await page.getByLabel("CNPJ").fill("11.111.111/1111-11");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("CNPJ inválido")).toBeVisible();
    await fillEmpresa(page, prestador.empresa);

    await expect(page.getByText("Etapa 3 de 5")).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Escolha pelo menos uma categoria.")).toBeVisible();
    await page.getByRole("group", { name: "O que sua empresa faz?" }).getByRole("button", { name: "Usinagem" }).click();
    await page.getByRole("group", { name: "Atende outras cidades?" }).getByRole("button", { name: "Votorantim" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByText("Etapa 4 de 5")).toBeVisible();
    await page.getByLabel("Descrição").fill("Torneamento CNC de peças seriadas em aço e alumínio, com inspeção dimensional.");
    await page.getByLabel("Ano de fundação").fill("2010");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByText("Etapa 5 de 5")).toBeVisible();
    await expect(page.getByText(`${prestador.empresa} Ltda`)).toBeVisible();
    await page.getByRole("button", { name: "Concluir cadastro" }).click();

    await page.waitForURL("**/painel?bemvindo=1");
    await expect(page.getByRole("heading", { name: prestador.empresa })).toBeVisible();
    await expect(page.getByText("Cadastro concluído")).toBeVisible();
    await expect(page.getByText("Visualizações do perfil")).toBeVisible();

    // Equipamento.
    // Header reconhece a sessão criada no cadastro.
    await expect(page.getByText("Menu da conta")).toBeAttached();

    await page.getByRole("link", { name: "Meu perfil" }).click();
    await page.waitForURL("**/painel/perfil");
    await page.getByRole("link", { name: "Equipamentos" }).click();
    await page.waitForURL("**/painel/perfil?aba=equipamentos");
    await page.getByLabel("Máquina ou equipamento").fill("Torno CNC");
    await page.getByLabel("Modelo").fill("Romi GL 240");
    await page.getByLabel("Quantidade").fill("2");
    await page.getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByText("Romi GL 240")).toBeVisible();

    // Foto de trabalho.
    await page.getByRole("link", { name: "Logo e fotos" }).click();
    await page.waitForURL("**/painel/perfil?aba=fotos");
    await expect(page.getByText("0 de 5")).toBeVisible();
    await page.getByLabel("Legenda").fill("Flange usinado");
    await page.locator('input[type="file"]').nth(1).setInputFiles(path.join(__dirname, "fixtures/foto.png"));
    await expect(page.getByText("1 de 5")).toBeVisible();
    await expect(page.getByText("Flange usinado")).toBeVisible();
  });

  test("contratante pede orçamento com anexo", async ({ page }) => {
    await page.goto("/cadastro/empresa");
    await expect(page.getByText("Etapa 1 de 3")).toBeVisible();
    await page.getByLabel("Seu nome").fill(contratante.nome);
    await page.getByLabel("E-mail").fill(contratante.email);
    await page.getByLabel("Senha", { exact: true }).fill(contratante.senha);
    await page.getByRole("button", { name: "Criar conta" }).click();
    await fillEmpresa(page, contratante.empresa);
    await page.getByRole("button", { name: "Concluir cadastro" }).click();
    await page.waitForURL("**/painel?bemvindo=1");

    await page.getByRole("link", { name: "Pedir orçamento" }).first().click();
    await page.getByLabel("Tipo de serviço").selectOption({ label: "Usinagem" });
    await page.getByLabel("Onde será o serviço").selectOption({ label: "Votorantim" });
    await expect(page.getByText(/vão receber: \d+ empresas?/)).toBeVisible();

    await page.getByLabel("Título do pedido").fill(titulo);
    await page.getByLabel("Descrição").fill("20 flanges em aço 1020, diâmetro 200 mm, furação conforme desenho anexo.");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures/desenho.pdf"));
    await expect(page.getByText("desenho.pdf")).toBeVisible();
    await page.getByRole("button", { name: "Enviar pedido" }).click();

    await page.waitForURL(/\/orcamentos\/[0-9a-f-]+\?enviado=1/);
    quoteUrl = new URL(page.url()).pathname;
    await expect(page.getByText(/Pedido enviado para \d+ fornecedor/)).toBeVisible();
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
    await expect(page.getByText("Aguardando propostas")).toBeVisible();
  });

  test("prestador recebe e responde o pedido", async ({ page }) => {
    await login(page, prestador.email, prestador.senha);
    await page.getByRole("link", { name: /Pedidos recebidos/ }).click();
    await page.getByRole("link", { name: new RegExp(titulo) }).click();
    await expect(page).toHaveURL(new RegExp(quoteUrl));
    await expect(page.getByText(contratante.empresa)).toBeVisible();
    await expect(page.getByRole("link", { name: "Montar orçamento" })).toBeVisible();

    await page.getByText("Responder só com valor estimado").click();
    await page.getByLabel("Mensagem").fill("Fazemos em 12 dias, material incluso, frete por nossa conta.");
    await page.getByLabel("Valor estimado (R$)").fill("4.800,00");
    await page.getByLabel("Prazo de entrega (dias)").fill("12");
    await page.getByRole("button", { name: "Enviar proposta" }).click();
    await expect(page.getByRole("heading", { name: "Sua proposta" })).toBeVisible();
    await expect(page.getByText("R$ 4.800,00")).toBeVisible();
  });

  test("contratante compara, escolhe e avalia", async ({ page }) => {
    await login(page, contratante.email, contratante.senha, quoteUrl);
    await expect(page.getByText("1 visualizou")).toBeVisible();
    const card = page.getByRole("listitem").filter({ hasText: prestador.empresa });
    await expect(card.getByText("R$ 4.800,00")).toBeVisible();
    await expect(card.getByText("12 dias", { exact: true })).toBeVisible();

    await card.getByRole("button", { name: "Escolher este fornecedor" }).click();
    await card.getByRole("button", { name: "Confirmar" }).click();
    await expect(card.getByText("Escolhido")).toBeVisible();

    await card.locator("label").filter({ hasText: "5 — Excelente" }).click();
    await expect(card.getByRole("radio", { name: "5 — Excelente" })).toBeChecked();
    await card.getByLabel(/Comentário/).fill("Entregou antes do prazo, peças perfeitas.");
    await card.getByRole("button", { name: "Publicar avaliação" }).click();
    await expect(card.getByText("Sua avaliação")).toBeVisible();
  });

  test("avaliação aparece no perfil público e prestador vê que foi escolhido", async ({ page }) => {
    await login(page, prestador.email, prestador.senha, "/painel/orcamentos?filtro=respondidos");
    await expect(page.getByRole("link", { name: new RegExp(titulo) }).getByText("Escolhido")).toBeVisible();

    await page.goto("/painel");
    const [profile] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("link", { name: "Ver perfil público" }).click(),
    ]);
    await expect(profile.getByText("Entregou antes do prazo, peças perfeitas.")).toBeVisible();
    await expect(profile.getByText("Torno CNC")).toBeVisible();
  });
});
