import assert from "node:assert/strict";
import { test } from "node:test";
import { extractListing } from "./extractListing.ts";

test("extractListing extracts minimal structured fields from listing text", () => {
  const result = extractListing({
    sourceId: "immobilie1",
    sourceUrl: "https://anbieter.immobilie1.de/expose/demo",
    title: "Traumhaft schöne Maisonettewohnung mit Klimaanlage",
    text: [
      "Traumhaft schöne Maisonettewohnung mit Klimaanlage",
      "Maisonette in 41564 Kaarst",
      "1.695 €",
      "Miete zzgl. NK",
      "115 m²",
      "Wohnfläche",
      "4",
      "Zimmer",
      "Gäste-WC",
      "Keller",
      "Balkon"
    ].join("\n")
  });

  assert.equal(result.sourceId, "immobilie1");
  assert.equal(result.sourceUrl, "https://anbieter.immobilie1.de/expose/demo");
  assert.equal(result.title, "Traumhaft schöne Maisonettewohnung mit Klimaanlage");
  assert.equal(result.location, "41564 Kaarst");
  assert.equal(result.priceEur, 1695);
  assert.equal(result.livingAreaSqm, 115);
  assert.equal(result.rooms, 4);
  assert.deepEqual(result.equipment, ["Gäste-WC", "Keller", "Balkon"]);
  assert.match(result.rawText, /Miete zzgl\. NK/);
});

test("extractListing keeps unknown values undefined", () => {
  const result = extractListing({
    sourceId: "kleinanzeigen",
    sourceUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
    title: "",
    text: "Schöne Wohnung auf Anfrage"
  });

  assert.equal(result.title, "Untitled listing");
  assert.equal(result.priceEur, undefined);
  assert.equal(result.livingAreaSqm, undefined);
  assert.equal(result.rooms, undefined);
  assert.deepEqual(result.equipment, []);
});

test("extractListing handles common inline area and room layouts", () => {
  const result = extractListing({
    sourceId: "kleinanzeigen",
    sourceUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
    title: "Helle Wohnung",
    text: [
      "Helle Wohnung",
      "Wohnfläche 115 m²",
      "4 Zimmer",
      "1.250 € Miete"
    ].join("\n")
  });

  assert.equal(result.livingAreaSqm, 115);
  assert.equal(result.rooms, 4);
  assert.equal(result.priceEur, 1250);
});

test("extractListing handles value-before-label inline layouts", () => {
  const result = extractListing({
    sourceId: "immobilie1",
    sourceUrl: "https://anbieter.immobilie1.de/expose/demo",
    title: "Maisonette",
    text: "Maisonette\n115 m² Wohnfläche\n2,5 Zimmer\n1.695 €"
  });

  assert.equal(result.livingAreaSqm, 115);
  assert.equal(result.rooms, 2.5);
});

test("extractListing extracts floor information", () => {
  const result = extractListing({
    sourceId: "kleinanzeigen",
    sourceUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
    title: "Wohnung mit Balkon",
    text: "Etage 3\nWohnfläche 61 m²\n2 Zimmer"
  });

  assert.equal(result.floor, "3");
});

test("extractListing extracts public contact details from listing text", () => {
  const result = extractListing({
    sourceId: "immobilie1",
    sourceUrl: "https://anbieter.immobilie1.de/expose/demo",
    title: "Wohnung mit Kontakt",
    text: [
      "Anbieter",
      "Muster Immobilien GmbH",
      "Kontaktperson: Maria Becker",
      "Telefon: +49 221 1234567",
      "E-Mail: maria.becker@example.com",
      "Kontaktformular: https://anbieter.immobilie1.de/kontakt/demo"
    ].join("\n")
  });

  assert.deepEqual(result.contact, {
    name: "Maria Becker",
    company: "Muster Immobilien GmbH",
    phone: "+49 221 1234567",
    email: "maria.becker@example.com",
    contactFormUrl: "https://anbieter.immobilie1.de/kontakt/demo"
  });
});
