import "dotenv/config";
import { supportedSources } from "@hunterai/sources";

console.log("HunterAi worker ready");
console.log("Supported sources:", supportedSources.map((source) => source.id).join(", "));
