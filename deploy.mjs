/**
 * Deploy para GitHub Pages.
 * Uso: npm run deploy
 *
 * O que faz:
 *  1. npm run build  — gera dist/
 *  2. Commita os arquivos de dist/ num branch temporário orphan
 *  3. Faz push forçado para origin/gh-pages
 *  4. Remove o branch temporário local
 */

import { execSync } from "child_process";
import { existsSync } from "fs";

const run = (cmd, opts = {}) => {
  console.log("→", cmd);
  execSync(cmd, { stdio: "inherit", ...opts });
};

// 1. Build
run("npm run build");

if (!existsSync("dist/index.html")) {
  console.error("❌ dist/index.html não encontrado. Build falhou?");
  process.exit(1);
}

// 2. Commit orphan temporário a partir do dist/
const TEMP = "gh-pages-temp-" + Date.now();

run(`git --work-tree=dist checkout --orphan ${TEMP}`);
run("git --work-tree=dist add --all");
run(`git --work-tree=dist commit -m "Deploy ${new Date().toISOString().slice(0,16).replace("T"," ")}"`);

// 3. Push forçado para gh-pages
run(`git push origin ${TEMP}:gh-pages --force`);

// 4. Limpa branch local temporário
run("git checkout -f master");
run(`git branch -D ${TEMP}`);

console.log("\n✅ Deploy concluído → https://arionpereira.github.io/refeitorio-veneza/");
