// Product catalogue for AHodle.
//
// Product list started from the voordly Boodschappenlijst Index
// (https://voordly.com/boodschappenlijst). Prices, sizes and photos were then
// checked against Albert Heijn's own product search on 10 November 2026, using
// the regular price (priceBeforeBonus), not Bonus offers. Plain "AH Spaghetti"
// is no longer sold, so it was replaced by "AH Biologisch Spaghetti".
// `en` and `cat` were added by hand.
// Photos are in img/, named after the product (see imageSrc() in game.js); an
// optional `img` field overrides that path.
// `ahId` and `ahSize` are AH's product id and pack size, used by the updater.
//
// Use tools/update_products.py to add, replace or refresh products; it rewrites
// this file below the comment.
window.PRODUCTS = [
  { name: "AH Houdbare halfvolle melk", en: "Long-life semi-skimmed milk", size: "1 L", price: 0.80, cat: "dairy", ahId: 450534, ahSize: "1 l", url: "https://www.ah.nl/producten/product/wi450534/ah-houdbare-halfvolle-melk" },
  { name: "AH Houdbare volle melk", en: "Long-life whole milk", size: "1 L", price: 0.98, cat: "dairy", ahId: 450535, ahSize: "1 l", url: "https://www.ah.nl/producten/product/wi450535/ah-houdbare-volle-melk" },
  { name: "De Zaanse Hoeve Magere yoghurt", en: "Low-fat yoghurt", size: "1 L", price: 0.74, cat: "dairy", ahId: 1519, ahSize: "1 l", url: "https://www.ah.nl/producten/product/wi1519/de-zaanse-hoeve-magere-yoghurt" },
  { name: "AH Slagroom houdbaar", en: "Long-life whipping cream", size: "200 ml", price: 0.98, cat: "dairy", ahId: 34471, ahSize: "200 ml", url: "https://www.ah.nl/producten/product/wi34471/ah-slagroom-houdbaar" },
  { name: "De Zaanse Hoeve Roomboter gezouten", en: "Salted butter", size: "250 g", price: 1.09, cat: "dairy", ahId: 429613, ahSize: "250 g", url: "https://www.ah.nl/producten/product/wi429613/de-zaanse-hoeve-roomboter-gezouten" },
  { name: "AH Halvarine 100% plantaardig", en: "Plant-based half-fat spread", size: "500 g", price: 0.46, cat: "dairy", ahId: 594562, ahSize: "500 g", url: "https://www.ah.nl/producten/product/wi594562/ah-halvarine-100-plantaardig" },
  { name: "AH Verse scharreleieren M L", en: "Fresh barn eggs, medium/large", size: "10 stuks", sizeEn: "10 eggs", price: 4.09, cat: "dairy", ahId: 1530, ahSize: "10 stuks", url: "https://www.ah.nl/producten/product/wi1530/ah-verse-scharreleieren-m-l" },
  { name: "AH Verse scharreleieren S", en: "Fresh barn eggs, small", size: "6 stuks", sizeEn: "6 eggs", price: 2.49, cat: "dairy", ahId: 515281, ahSize: "6 stuks", url: "https://www.ah.nl/producten/product/wi515281/ah-verse-scharreleieren-s" },
  { name: "AH Extra lang lekker volkoren heel", en: "Wholemeal bread, whole loaf", size: "1 brood", sizeEn: "1 loaf", price: 0.93, cat: "bakery", ahId: 589882, ahSize: "per stuk", url: "https://www.ah.nl/producten/product/wi589882/ah-extra-lang-lekker-volkoren-heel" },
  { name: "AH Extra lang lekker wit heel", en: "White bread, whole loaf", size: "1 brood", sizeEn: "1 loaf", price: 0.92, cat: "bakery", ahId: 589587, ahSize: "per stuk", url: "https://www.ah.nl/producten/product/wi589587/ah-extra-lang-lekker-wit-heel" },
  { name: "AH Tarwebloem", en: "Plain flour", size: "1 kg", price: 0.81, cat: "pantry", ahId: 36783, ahSize: "1 kg", url: "https://www.ah.nl/producten/product/wi36783/ah-tarwebloem" },
  { name: "AH Kristalsuiker", en: "Granulated sugar", size: "1 kg", price: 0.52, cat: "pantry", ahId: 511002, ahSize: "1 kg", url: "https://www.ah.nl/producten/product/wi511002/ah-kristalsuiker" },
  { name: "Perla Huisblends Aroma snelfiltermaling", en: "Ground filter coffee", size: "500 g", price: 7.99, cat: "drinks", ahId: 1487, ahSize: "500 g", url: "https://www.ah.nl/producten/product/wi1487/perla-huisblends-aroma-snelfiltermaling" },
  { name: "AH Zwarte thee Engelse melange 1 kop", en: "English blend black tea", size: "50 zakjes", sizeEn: "50 bags", price: 0.49, cat: "drinks", ahId: 381377, ahSize: "50 stuks", url: "https://www.ah.nl/producten/product/wi381377/ah-zwarte-thee-engelse-melange-1-kop" },
  { name: "AH Biologisch Spaghetti", en: "Organic spaghetti", size: "500 g", price: 0.69, cat: "pantry", ahId: 159760, ahSize: "500 g", url: "https://www.ah.nl/producten/product/wi159760/ah-biologisch-spaghetti" },
  { name: "AH Witte rijst", en: "White rice", size: "1 kg", price: 1.99, cat: "pantry", ahId: 421641, ahSize: "1 kg", url: "https://www.ah.nl/producten/product/wi421641/ah-witte-rijst" },
  { name: "AH Tomatenpuree", en: "Tomato purée", size: "70 g", price: 0.49, cat: "pantry", ahId: 2226, ahSize: "70 g", url: "https://www.ah.nl/producten/product/wi2226/ah-tomatenpuree" },
  { name: "AH Tomatenblokjes", en: "Chopped tomatoes", size: "400 g", price: 0.35, cat: "pantry", ahId: 30851, ahSize: "400 g", url: "https://www.ah.nl/producten/product/wi30851/ah-tomatenblokjes" },
  { name: "AH Olijfolie traditioneel", en: "Olive oil", size: "500 ml", price: 4.95, cat: "pantry", ahId: 48896, ahSize: "0,5 l", url: "https://www.ah.nl/producten/product/wi48896/ah-olijfolie-traditioneel" },
  { name: "AH Scharrel kipfilet 1 stuk", en: "Free-range chicken breast", size: "200 g", price: 3.79, cat: "meat", ahId: 197183, ahSize: "ca. 200 g", url: "https://www.ah.nl/producten/product/wi197183/ah-scharrel-kipfilet-1-stuk" },
  { name: "AH Rundergehakt minder vet", en: "Lean minced beef", size: "300 g", price: 3.99, cat: "meat", ahId: 594926, ahSize: "300 g", url: "https://www.ah.nl/producten/product/wi594926/ah-rundergehakt-minder-vet" },
  { name: "AH Zaanlander Jong belegen 48+ plakken", en: "Young matured cheese slices", size: "150 g", price: 2.65, cat: "cheese", ahId: 602289, ahSize: "150 g", url: "https://www.ah.nl/producten/product/wi602289/ah-zaanlander-jong-belegen-48-plakken" },
  { name: "AH Biologisch Italiaanse parmigiano reggiano", en: "Organic Parmigiano Reggiano", size: "40 g", price: 1.99, cat: "cheese", ahId: 400471, ahSize: "40 g", url: "https://www.ah.nl/producten/product/wi400471/ah-biologisch-italiaanse-parmigiano-reggiano" },
  { name: "Chiquita Ready to eat bananen", en: "Ready-to-eat bananas", size: "5 stuks", sizeEn: "5 bananas", price: 1.99, cat: "produce", ahId: 595323, ahSize: "5 stuks", url: "https://www.ah.nl/producten/product/wi595323/chiquita-ready-to-eat-bananen" },
  { name: "AH Iets kruimige aardappel", en: "Slightly floury potatoes", size: "3 kg", price: 3.85, cat: "produce", ahId: 96049, ahSize: "3 kg", url: "https://www.ah.nl/producten/product/wi96049/ah-iets-kruimige-aardappel" },
  { name: "AH Gele uien", en: "Yellow onions", size: "3 stuks", sizeEn: "3 onions", price: 0.89, cat: "produce", ahId: 525847, ahSize: "3 stuks", url: "https://www.ah.nl/producten/product/wi525847/ah-gele-uien" },
  { name: "AH Winterpeen", en: "Winter carrots", size: "1 kg", price: 1.39, cat: "produce", ahId: 4076, ahSize: "1 kg", url: "https://www.ah.nl/producten/product/wi4076/ah-winterpeen" },
  { name: "AH Biologisch Broccoli", en: "Organic broccoli", size: "per stuk", sizeEn: "1 head", price: 2.79, cat: "produce", ahId: 466127, ahSize: "per stuk", url: "https://www.ah.nl/producten/product/wi466127/ah-biologisch-broccoli" },
  { name: "AH Terra Hollandse bruine bonen", en: "Dutch brown beans", size: "800 g", price: 1.15, cat: "pantry", ahId: 840, ahSize: "800 g", url: "https://www.ah.nl/producten/product/wi840/ah-terra-hollandse-bruine-bonen" },
];
