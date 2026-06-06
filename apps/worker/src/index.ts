import "dotenv/config";
import { supportedSources } from "@homehunter/sources";

console.log("HomeHunter worker ready");
console.log("Supported sources:", supportedSources.map((source) => source.id).join(", "));
