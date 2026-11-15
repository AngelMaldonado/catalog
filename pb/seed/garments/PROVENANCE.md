# Procedencia de las imágenes

Las imágenes fueron generadas con OpenAI image generation a través de Codex CLI, mediante la herramienta integrada `image_gen.imagegen`. No se dibujaron imágenes mediante código ni se retocaron, redimensionaron o recompusieron los PNG; se copiaron los archivos originales a las rutas solicitadas.

Fecha de generación: **2026-11-15** (America/Mexico_City).

## Modelo, tamaño y limitaciones

La respuesta de la herramienta no publica un identificador de modelo específico ni un selector de resolución. Los metadatos C2PA incluidos en cada PNG identifican el agente como `ChatGPT`, versión **`gpt-image`**, y el servicio como `OpenAI Media Service API`. Ese es el nombre reportado disponible; no se presume una versión numerada. Se solicitó la máxima resolución nativa en cada prompt. Los tamaños reales se verificaron en las cabeceras PNG: **1254 × 1254 px** para prendas y **941 × 1672 px** para fondos (aproximadamente 9:16). No se aplicó ampliación artificial.

Se generaron tres intentos por prenda y se conservó el tercero en cada caso, por su encuadre, superficie imprimible y menor sombra de fondo. No se aprecian logos, textos, etiquetas, perchas ni maniquíes. Aun después de las correcciones, el fondo gris conserva una leve variación tonal: no se garantiza uniformidad matemática ni coincidencia exacta de todos sus píxeles con #E9E9E9. Los cuatro fondos navideños se conservaron en su primer intento.

## Archivos y prompts exactos

### `pb/seed/garments/tshirt-front-white.png`

- Fecha: 2026-11-15.
- Intento conservado: 3 de 3.
- Modelo reportado en metadatos: `gpt-image` (agente `ChatGPT`; versión específica no expuesta por la herramienta).
- Tamaño real del PNG: 1254 × 1254 px.
- Prompt exacto enviado:

```text
Use case: product-mockup. Generate one final photorealistic e-commerce ghost-mannequin product photograph of a plain pure WHITE crew-neck short-sleeve t-shirt. Single garment, straight front view, perfectly centered and symmetric, chest-height camera without perspective tilt. Invisible mannequin: absolutely no person, mannequin parts, hanger, tags, labels, logos, text or prints. Smooth clean blank printable chest; natural soft fabric folds only near edges. White neutral cotton knit, never cream or grey. Perfectly uniform flat #E9E9E9 light grey seamless background across the entire image, no gradient, floor line or props; only extremely subtle contact shadow immediately beside garment. Soft diffuse front-top studio lighting, gentle neutral natural fabric shading and fine realistic texture, no harsh highlights or color cast. Cohesive premium catalog art direction to match a white hoodie and baseball cap set. Square composition, garment occupies 80% of image height, even margins. Generate at the largest supported native square resolution, preferably 2048x2048 or larger, minimum 1024x1024. PNG.
Correction for attempt 2: the previous result had a non-uniform background and too little margin. Recreate this product photo with garment precisely 80% frame height, 10% top and bottom margin. Critical: every background pixel far from garment must be EXACT flat #E9E9E9, no studio falloff, no background lighting variation or cast shadow. Maintain white garment and its natural shading. Largest native square output.
Attempt 3 final priority: use a perfectly solid digital #E9E9E9 backdrop, not a photographed grey studio wall. No variation anywhere in background. Keep photorealistic white t-shirt isolated against that flat color, full front ghost mannequin and 80% height. Request maximum native square resolution.
```

### `pb/seed/garments/hoodie-front-white.png`

- Fecha: 2026-11-15.
- Intento conservado: 3 de 3.
- Modelo reportado en metadatos: `gpt-image` (agente `ChatGPT`; versión específica no expuesta por la herramienta).
- Tamaño real del PNG: 1254 × 1254 px.
- Prompt exacto enviado:

```text
Use case: product-mockup. One final photorealistic premium e-commerce ghost-mannequin photograph: pure WHITE pullover hoodie with front kangaroo pocket, white drawstrings, ribbed cuffs and hem, hood raised naturally with invisible support. Absolutely no visible person, mannequin, hanger, labels, tags, logos, text or prints. Straight front view, centered, symmetric, chest-height camera, no perspective tilt. Clean smooth blank upper chest suitable for printing, only soft natural folds toward edges. Pure neutral white cotton fabric, not cream or grey. Background must be perfectly flat uniform solid RGB 233,233,233 (#E9E9E9) everywhere outside the garment, no gradient, vignette, floor line, scenery or props; extremely subtle contact shadow only directly at silhouette. Soft diffuse neutral front-top lighting, gentle realistic fabric texture and shading, no harsh highlights or color cast. Match a premium white t-shirt and cap catalog set. Square, full garment at about 80% frame height with even margins. Largest native square image size supported, request 2048x2048 or higher, at least 1024x1024. PNG.
Correction for attempt 2: enforce exact solid flat #E9E9E9 background without any gradient or vignette. Garment precisely 80% frame height with 10% empty top and bottom margins. No cast shadow except extremely faint contact immediately beside garment. Preserve natural white fabric shading.
Attempt 3 final priority: perfectly solid digital #E9E9E9 backdrop, not a photographed grey studio wall. Zero background variation, gradient or vignette. Photorealistic white hoodie isolated against this flat color, preserving gentle fabric shadows and a large smooth print area. 80% image height. Maximum native square resolution.
```

### `pb/seed/garments/cap-front-white.png`

- Fecha: 2026-11-15.
- Intento conservado: 3 de 3.
- Modelo reportado en metadatos: `gpt-image` (agente `ChatGPT`; versión específica no expuesta por la herramienta).
- Tamaño real del PNG: 1254 × 1254 px.
- Prompt exacto enviado:

```text
Use case: product-mockup. One final photorealistic premium e-commerce invisible-mannequin photograph of a plain pure WHITE six-panel baseball cap, structured front panels and curved brim, white stitching and white top button. Perfectly centered symmetric straight FRONT view, no side or three-quarter rotation. Brim points directly toward the viewer; camera very slightly above brim so smooth blank front panels and upper brim remain visible. No person, head, mannequin, hanger, tags, labels, logos, text or prints. Pure neutral white cotton twill, never cream or grey. Clean smooth front panels suitable for printed artwork. Background perfectly flat uniform solid RGB 233,233,233 (#E9E9E9) everywhere, no gradient or vignette, floor line or props; only very subtle contact shadow immediately at silhouette. Soft diffuse neutral front-top studio light, gentle realistic shading and fine fabric texture, no harsh highlights or color cast. Same art direction as a premium white t-shirt and hoodie set. Square framing, full cap occupies about 80% frame height, even margins. Largest native square resolution supported, preferably 2048x2048 or above, at least 1024x1024. PNG.
Correction for attempt 2: background exact solid flat #E9E9E9 with no tonal variation, gradient, vignette or shadow pooling. Only extremely faint contact at silhouette. Cap 80% frame height with 10% empty top and bottom margins. Keep frontal symmetric orientation and natural pure white fabric shading.
Attempt 3 final priority: perfectly solid digital #E9E9E9 backdrop, not a photographed grey wall. No gradient or vignette. Remove shadow pooling under brim onto background; retain shading on the white cap itself. Full frontal cap centered and symmetric, about 80% height, maximum native square resolution.
```

### `spikes/page-curl/public/bg/cover.png`

- Fecha: 2026-11-15.
- Intento conservado: 1 de 1.
- Modelo reportado en metadatos: `gpt-image` (agente `ChatGPT`; versión específica no expuesta por la herramienta).
- Tamaño real del PNG: 941 × 1672 px.
- Prompt exacto enviado:

```text
Use case: ads-marketing. Generate a portrait 9:16 full-bleed Christmas product catalog COVER BACKGROUND, PNG at highest supported portrait resolution, preferably 2160x3840, or closest supported portrait size. Luxurious photorealistic festive still-life art direction: deep ruby red and antique gold, richly detailed natural pine branches framing the outer edges, delicate warm golden fairy-light bokeh, polished and brushed gold ornaments, tactile red velvet and subtle fine paper texture. Warm elegant soft cinematic lighting. Keep a large calm low-contrast deep red central area clear for products to be placed later; intricate decorations concentrated at edges and corners. Rich realistic fine detail for a performance prototype's image weight. No products in center, no people, no text, no letters, no typography, no logos, no watermark. One single finished page background, not a mockup or collage.
```

### `spikes/page-curl/public/bg/divider.png`

- Fecha: 2026-11-15.
- Intento conservado: 1 de 1.
- Modelo reportado en metadatos: `gpt-image` (agente `ChatGPT`; versión específica no expuesta por la herramienta).
- Tamaño real del PNG: 941 × 1672 px.
- Prompt exacto enviado:

```text
Use case: ads-marketing. One full-bleed portrait 9:16 Christmas catalog DIVIDER page background. Highest supported native portrait resolution, preferably 2160x3840 or closest supported. Photorealistic luxurious winter botanical texture, deep dark evergreen and clean snowy white, richly detailed fir and pine needles coated with delicate snow and frost crystals framing the outer edges and corners. Elegant soft winter light, subtle warm glints, calm sophisticated seasonal atmosphere matching a red-and-gold Christmas catalog. Large less-busy central area of softly textured dark green with low contrast for products to be overlaid later; detailed snow and evergreen branches stay mainly around perimeter. Dense realistic microtexture for realistic performance prototype image weight. No text, letters, typography, logos, watermark, people or products. PNG, single finished background, not a mockup or collage.
```

### `spikes/page-curl/public/bg/products.png`

- Fecha: 2026-11-15.
- Intento conservado: 1 de 1.
- Modelo reportado en metadatos: `gpt-image` (agente `ChatGPT`; versión específica no expuesta por la herramienta).
- Tamaño real del PNG: 941 × 1672 px.
- Prompt exacto enviado:

```text
Use case: ads-marketing. Generate one full-bleed portrait 9:16 Christmas catalog PRODUCTS page background, highest supported native portrait resolution preferably 2160x3840 or closest supported. Photorealistic elegant warm soft ivory paper and fine linen texture, tactile rich microdetail across page. Very subtle natural pine sprigs, tiny tasteful matte gold and ruby Christmas ornaments and delicate warm fairy lights arranged only around outer edges and corners. Large calm uncluttered central 70% area of softly textured warm paper for later product placement. Soft warm diffuse studio lighting, restrained luxurious Christmas-season editorial art direction coherent with deep red/gold cover and snowy evergreen divider. Detailed real fibers, needles and ornament finishes for realistic image weight in a performance prototype. No text, letters, typography, logos, watermark, people or products. PNG, single finished background, not a page mockup or collage.
```

### `spikes/page-curl/public/bg/back.png`

- Fecha: 2026-11-15.
- Intento conservado: 1 de 1.
- Modelo reportado en metadatos: `gpt-image` (agente `ChatGPT`; versión específica no expuesta por la herramienta).
- Tamaño real del PNG: 941 × 1672 px.
- Prompt exacto enviado:

```text
Use case: ads-marketing. One full-bleed portrait 9:16 Christmas catalog BACK COVER background, highest supported native portrait resolution preferably 2160x3840 or closest supported. Photorealistic luxurious winter night scene, snow-covered evergreen forest and a distant cozy lodge with warm golden window lights and subtle fairy lights along peripheral trees. Deep midnight blue sky, soft snowfall, intricate snow crystals and pine branches along outer edges, restrained amber bokeh. Warm elegant cinematic seasonal mood matching a red/gold and evergreen Christmas catalog. Leave a large calm less-busy central area of smooth softly lit night sky and snowy clearing where products may later be placed; rich detail concentrated around edges and lower corners. Realistic fine texture and depth for performance prototype image weight. No people, no products, no text, letters, typography, logos, signs or watermark. PNG, single finished page background, no mockup or collage.
```



## Derivados: máscaras, sombreado y áreas de impresión

`{kind}-mask.png` y `{kind}-shading.png` salen de las fotos base con `pb/tools/garments.mjs` (`just garments prepare`), sin IA ni herramientas externas:

- **Máscara.** El fondo de las fotos es un gris plano (σ local ≈ 0.5) y la tela tiene textura (σ ≥ 1.1), aunque los dos compartan el mismo nivel de gris en los pliegues. Por eso el fondo crece desde el borde sólo por los píxeles sin textura; para medir la textura se le quita a la imagen su tendencia suave, de modo que la viñeta y la sombra de contacto no cuenten. Después se queda la componente más grande, se rellenan los huecos, se erosiona 3 px para quitar el halo y se suaviza el borde 0.8 px.
- **Sombreado.** Es la luminancia de la prenda normalizada a su blanco (p98 → 255). Se multiplica sobre el tinte y sobre el diseño.
- **Áreas de impresión.** Se miden sobre las máscaras: el torso de la playera ocupa 0.42 del ancho (~20″), así que un estampado de 12″ × 16″ queda en 0.25 × 0.34. Están en `PRINT_AREAS` y en la migración `1794768200_garment_assets.js`.

Fecha: 2026-11-15.
