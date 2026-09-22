import { mkdir, writeFile } from "node:fs/promises";

const required = ["TENCENT_DOCS_ACCESS_TOKEN", "TENCENT_DOCS_CLIENT_ID", "TENCENT_DOCS_OPEN_ID"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required secret: ${name}`);
}

const documents = [
  { key: "aromatics", title: "Aromatics Trading V5.2 Rock Chang", fileId: "DQ1NtWHRIU0ZOd290", sheetId: "000001", range: "A1:GR1000", url: "https://docs.qq.com/sheet/DQ1NtWHRIU0ZOd290?tab=000001" },
  { key: "c4", title: "C4 Pool MTBE Optimizaer V6.3 RockChang", fileId: "DQ3V1cFVYdGpBZGhI", sheetId: "000002", range: "A1:GR1000", url: "https://docs.qq.com/sheet/DQ3V1cFVYdGpBZGhI?tab=000002" },
  { key: "olefins", title: "Napt&LPG Chain Engine V1.2 RockChang", fileId: "DQ3BPQkpaa2pKRG9U", sheetId: "000001", range: "A1:GR1000", url: "https://docs.qq.com/sheet/DQ3BPQkpaa2pKRG9U?tab=000001" },
];

function findSheet(payload) {
  return [
    payload?.data?.sheets?.[0], payload?.sheets?.[0], payload?.data?.sheet,
    payload?.sheet, payload?.data, payload
  ].find((item) => item && (
    Array.isArray(item.data) || Array.isArray(item.rows) ||
    Array.isArray(item.rowData) || Array.isArray(item.values)
  ));
}

function dimensions(payload) {
  const sheet = findSheet(payload);
  if (!sheet) throw new Error("Unrecognized Tencent Docs response structure");
  if (Array.isArray(sheet.values)) {
    return {
      rowCount: sheet.values.length,
      columnCount: sheet.values.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0),
    };
  }
  const blocks = Array.isArray(sheet.data) ? sheet.data : [sheet];
  let rowCount = 0;
  let columnCount = 0;
  for (const block of blocks) {
    const rows = block?.rows ?? block?.rowData ?? [];
    const startRow = Number(block?.startRow ?? block?.startRowIndex ?? 0);
    const startColumn = Number(block?.startColumn ?? block?.startColumnIndex ?? 0);
    rowCount = Math.max(rowCount, startRow + rows.length);
    for (const row of rows) {
      const values = row?.values ?? row?.cells ?? (Array.isArray(row) ? row : []);
      columnCount = Math.max(columnCount, startColumn + values.length);
    }
  }
  return { rowCount, columnCount };
}

async function inspect(document) {
  const endpoint = `https://docs.qq.com/openapi/spreadsheet/v3/files/${document.fileId}/${document.sheetId}/${document.range}`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "Access-Token": process.env.TENCENT_DOCS_ACCESS_TOKEN,
      "Client-Id": process.env.TENCENT_DOCS_CLIENT_ID,
      "Open-Id": process.env.TENCENT_DOCS_OPEN_ID,
    },
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); }
  catch { throw new Error(`${document.key}: non-JSON response (HTTP ${response.status})`); }
  if (!response.ok) throw new Error(`${document.key}: HTTP ${response.status} — ${payload?.message || payload?.msg || "request failed"}`);
  const code = payload?.ret ?? payload?.code ?? payload?.errorCode;
  if (code !== undefined && ![0, "0", 200, "200"].includes(code)) {
    throw new Error(`${document.key}: API error ${code} — ${payload?.message || payload?.msg || "unknown error"}`);
  }
  const size = dimensions(payload);
  return { title: document.title, url: document.url, fileId: document.fileId, sheetId: document.sheetId, status: "connected", ...size };
}

const result = {};
for (const document of documents) {
  result[document.key] = await inspect(document);
  console.log(`${document.key}: connected (${result[document.key].rowCount} rows × ${result[document.key].columnCount} columns)`);
}

await mkdir("data", { recursive: true });
await writeFile("data/tencent-docs.json", JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "Tencent Docs Open API v3",
  status: "connected",
  note: "Connectivity metadata only; no spreadsheet cell values are published.",
  documents: result,
}, null, 2) + "\n", "utf8");
