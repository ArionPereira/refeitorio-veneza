# Refeitório · Sementes Veneza

App de gestão do cardápio do refeitório (UBS). Single-file PWA: **React + Supabase**,
empacotado num único `index.html` via esbuild. Sem framework de servidor.

## Estrutura

```
src/entry.jsx           ← CÓDIGO-FONTE (é aqui que se edita tudo)
public/                 ← assets servidos junto com o app
  pdf.worker.min.mjs    ← motor do leitor de PDF (CEASA)
  manifest.webmanifest  ← PWA
  sw.js                 ← service worker (PWA)
  icon-192.png / icon-512.png
  logo_b64.txt          ← logo da Veneza em base64 (embutido no build)
build.mjs               ← gera dist/index.html (esbuild + injeção do HTML)
package.json            ← dependências e script de build
dist/                   ← SAÍDA do build (não versionar; é o que vai pro GitHub Pages)
```

## Como rodar (primeira vez)

Pré-requisito: **Node.js** instalado (nodejs.org, versão LTS).

```bash
npm install        # instala react, supabase, pdfjs, esbuild
npm run build      # gera dist/index.html + assets
```

Para publicar: suba **todo o conteúdo de `dist/`** no GitHub Pages
(index.html, pdf.worker.min.mjs, sw.js, manifest.webmanifest, icon-192.png, icon-512.png).

## Fluxo de desenvolvimento

1. Edite `src/entry.jsx`.
2. `npm run build`.
3. Abra `dist/index.html` — mas o leitor de PDF e o PWA só funcionam
   **servido por HTTP/HTTPS** (não via `file://`). Para testar local:
   ```bash
   npx serve dist        # ou: python -m http.server -d dist
   ```
   e acesse `http://localhost:3000`.
4. Publique `dist/` no GitHub Pages.

## Arquitetura (resumo)

- **Estado** = um único objeto (insumos, pratos, cardápio por data/refeição,
  estoque, ceasa) salvo como **uma linha JSONB** no Supabase
  (tabela `html_tools_storage`, chave em `window.CHAVE`). Salvamento com debounce
  + realtime para sincronizar entre dispositivos.
- **Config** (URL/chave do Supabase, URL da função de IA) é injetada no `build.mjs`
  como `window.SUPABASE_URL/ANON/CHAVE/AI_PRICE_URL`. **A chave anônima é pública
  (protegida por RLS); a chave do Gemini NUNCA fica aqui** — vive na Edge Function.
- **Preço por IA / CEASA**:
  - `pdf.worker.min.mjs` + pdfjs lêem o PDF de cotação do CEASA-GO (client-side).
  - A "Referência de carnes" chama a Edge Function `sugerir-preco` (Gemini), cuja
    URL está em `window.AI_PRICE_URL`. O código da função está no Supabase
    (não neste repo) — modelo `gemini-2.5-flash`.

## Abas

Calendário · Fichas & custos (Pratos / Insumos / Consultar CEASA) · Operação ·
Relatório · Mural.

## Observações

- `pdfjs-dist` está fixado em `4.7.76`. Se atualizar, troque também o
  `public/pdf.worker.min.mjs` pela versão correspondente
  (`node_modules/pdfjs-dist/build/pdf.worker.min.mjs`).
- O build minifica e escapa acentos (\uXXXX) — checagens de string no output
  por texto acentuado dão falso-negativo; use trechos sem acento.
