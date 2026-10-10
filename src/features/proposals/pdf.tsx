import "server-only";

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { formatCurrency, formatFullDate, pluralize } from "@/lib/format";

import { formatDocument, formatQuantity, proposalCode, STATUS_LABELS } from "./format";
import type { PublicProposal } from "./queries";
import { unitLabel } from "./schemas";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#1f2937" },
  row: { flexDirection: "row" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1pt solid #d1d5db", paddingBottom: 12 },
  supplier: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  muted: { color: "#6b7280" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 18 },
  code: { fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "right" },
  section: { marginTop: 14 },
  th: { fontFamily: "Helvetica-Bold", color: "#6b7280", fontSize: 8, paddingVertical: 4 },
  tr: { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb", paddingVertical: 4 },
  cNum: { width: "5%" },
  cDesc: { width: "45%", paddingRight: 6 },
  cQtd: { width: "10%", textAlign: "right", paddingRight: 6 },
  cUn: { width: "10%" },
  cVu: { width: "15%", textAlign: "right", paddingRight: 6 },
  cTot: { width: "15%", textAlign: "right" },
  totals: { marginTop: 10, marginLeft: "auto", width: 200 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { fontSize: 12, fontFamily: "Helvetica-Bold", borderTop: "1pt solid #d1d5db", paddingTop: 4, marginTop: 2 },
  box: { marginTop: 14, padding: 10, backgroundColor: "#f3f4f6", borderRadius: 4 },
  label: { fontSize: 7, color: "#6b7280", marginBottom: 1 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#9ca3af", textAlign: "center" },
});

function ProposalPdf({ p }: { p: PublicProposal }) {
  const f = p.fornecedor;
  return (
    <Document title={`${proposalCode(p)} - ${p.titulo}`} author={f.nome} creator="InduxHub">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.supplier}>{f.nome}</Text>
            <Text style={s.muted}>
              {f.razaoSocial} - CNPJ {formatDocument(f.cnpj)}
            </Text>
            {f.cidade && <Text style={s.muted}>{`${f.cidade}/${f.uf}`}</Text>}
            {(f.whatsapp || f.email) && (
              <Text style={s.muted}>{[f.whatsapp && `WhatsApp +${f.whatsapp}`, f.email].filter(Boolean).join(" - ")}</Text>
            )}
          </View>
          <View>
            <Text style={s.code}>{proposalCode(p)}</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>Emitido em {formatFullDate(p.enviadoEm)}</Text>
            {p.status !== "enviado" && <Text style={[s.muted, { textAlign: "right" }]}>{STATUS_LABELS[p.status].label}</Text>}
          </View>
        </View>

        <Text style={s.title}>{p.titulo}</Text>
        <Text style={s.muted}>
          Para {p.clienteNome}
          {p.clienteDocumento ? ` - ${formatDocument(p.clienteDocumento)}` : ""}
        </Text>

        <View style={s.section}>
          <View style={[s.row, { borderBottom: "1pt solid #d1d5db" }]} fixed>
            <Text style={[s.th, s.cNum]}>#</Text>
            <Text style={[s.th, s.cDesc]}>Descrição</Text>
            <Text style={[s.th, s.cQtd]}>Qtd.</Text>
            <Text style={[s.th, s.cUn]}>Un.</Text>
            <Text style={[s.th, s.cVu]}>Valor unit.</Text>
            <Text style={[s.th, s.cTot]}>Total</Text>
          </View>
          {p.itens.map((item, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={s.cNum}>{i + 1}</Text>
              <Text style={s.cDesc}>{item.descricao}</Text>
              <Text style={s.cQtd}>{formatQuantity(item.quantidade)}</Text>
              <Text style={s.cUn}>{unitLabel(item.unidade)}</Text>
              <Text style={s.cVu}>{formatCurrency(item.valorUnitario)}</Text>
              <Text style={s.cTot}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{formatCurrency(p.subtotal)}</Text>
          </View>
          {p.desconto > 0 && (
            <View style={s.totalRow}>
              <Text style={s.muted}>Desconto</Text>
              <Text>- {formatCurrency(p.desconto)}</Text>
            </View>
          )}
          {p.frete > 0 && (
            <View style={s.totalRow}>
              <Text style={s.muted}>Frete</Text>
              <Text>{formatCurrency(p.frete)}</Text>
            </View>
          )}
          <View style={[s.totalRow, s.grand]}>
            <Text>Total</Text>
            <Text>{formatCurrency(p.total)}</Text>
          </View>
        </View>

        <View style={[s.box, s.row]} wrap={false}>
          <View style={{ width: "33%" }}>
            <Text style={s.label}>Prazo de entrega</Text>
            <Text>{p.prazoEntregaDias !== null ? pluralize(p.prazoEntregaDias, "dia", "dias") : "A combinar"}</Text>
          </View>
          <View style={{ width: "33%" }}>
            <Text style={s.label}>Válido até</Text>
            <Text>{formatFullDate(p.validade)}</Text>
          </View>
          <View style={{ width: "34%" }}>
            <Text style={s.label}>Pagamento</Text>
            <Text>{p.condicoesPagamento ?? "A combinar"}</Text>
          </View>
        </View>

        {p.observacoes && (
          <View style={s.section}>
            <Text style={[s.label, { fontSize: 8 }]}>Observações</Text>
            <Text>{p.observacoes}</Text>
          </View>
        )}

        <Text
          style={s.footer}
          fixed
          render={({ pageNumber, totalPages }) => `Gerado pelo InduxHub - página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}

export function renderProposalPdf(p: PublicProposal) {
  return renderToBuffer(<ProposalPdf p={p} />);
}
