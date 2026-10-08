// Uso: node --env-file=.env server/cli.mjs <sync|recluster|regenerate|status>
import { readJson } from "./store.mjs";
import { sync } from "./pipeline/sync.mjs";
import { readOverrides, toPublicLink } from "./overrides.mjs";

const [command = "sync"] = process.argv.slice(2);

if (command === "sync" || command === "recluster" || command === "regenerate") {
  // regenerate: refaz descrições e categorias de todos os links (mantém metadados e edições).
  const result = await sync({ recluster: command === "recluster", regenerate: command === "regenerate" });
  console.log(`${result.total} links · +${result.added} novos · -${result.removed} removidos`);
  for (const e of result.errors) console.error(`  ! ${e.browser}: ${e.message}`);
} else if (command === "status") {
  const overrides = readOverrides();
  const links = readJson("links.json", []).map((l) => toPublicLink(l, overrides));
  const counts = Object.entries(Object.groupBy(links, (l) => l.category || "(sem tag)"));
  console.log(`${links.length} links, ${links.filter((l) => l.untagged).length} sem tag`);
  for (const [name, list] of counts.sort((a, b) => b[1].length - a[1].length)) console.log(`  ${list.length}\t${name}`);
} else {
  console.error("comando desconhecido. Use: sync | recluster | regenerate | status");
  process.exit(1);
}
