# 照片级手账底板生成记录

## 生成提示词记录

使用内置 `image_gen`，不是 CLI / API key 工作流。共同请求是：`Photorealistic straight-down flat lay, landscape 16:9, notebook nearly filling the frame, central seam or rings at x50%. Authentic tactile paper fibers, realistic layered page edges, soft daylight and contact shadows. Both page interiors completely EMPTY and unobstructed for writing and media; decorations at outer margins only. No text, no letters, no handwriting, no people, no photographs, no logo, no watermark. Editorial stationery product photography, not vector illustration.`

各款追加的提示词：

- sketch：`Open green linen hardcover notebook on cream plush blanket. Pale warm ivory gridded paper, extremely faint small squares, softly worn rounded edges. Sage gingham tape at upper-right outer corner, mustard-yellow and sage torn vellum fragments, embroidered green fabric edge, tiny dried chamomile at bottom-left. Large empty interiors.`
- cream：`Open butter-cream softcover scrapbook on warm ivory gingham tablecloth. Rounded cotton pages and softly curved central spine. Blush scalloped fabric, pale-yellow handmade paper at outer edges, beige dotted translucent tape at corners. Pressed daisy far upper-right, original baked-bread watercolor paper cutout far bottom-left. Sunny natural light.`
- travel：`Open traveler's scrapbook with walnut-brown soft leather on sun-warmed dark wood. Tied central binding, thick rough cream pages. Blank transit ticket corners, kraft luggage tag, postage stamp shapes, faded blue map fragments restricted to outer margins; antique brass clip upper-left. Worn deckle fibers.`
- blue：`Transparent PVC jelly cover on oatmeal linen. Blue gingham washi tape, a little torn pale-blue paper, gold star-shaped paper clip far upper-left, tiny dried forget-me-not sprigs at outer corners. Ivory cotton pages with fine fibers, softly curled page edges and multilayer paper shadows.`
- forest：`Open botanical junk journal. Antique brass six-ring binding, handmade rough ivory deckle-edge paper in olive woven linen hard cover. Torn raw cream sheets and sage backing, translucent vellum with pressed fern far top-left, tiny pressed leaves at corners, olive gingham tape. Warm wooden desk.`
- film：`Open memory album, charcoal woven cloth hardcover on cool grey linen. Thick warm-white archival paper. Empty analog filmstrip snips at outer corners, silver bulldog clip upper-left, ivory torn blank ticket and desaturated black washi tape at margins. Sophisticated cinematic scrapbook.`
- chat：`Open transparent frosted PVC ring binder on white textured cotton. Central polished silver six-ring hardware, smooth light ivory unruled rounded pages. Pastel lavender and apricot translucent index tabs on far right edge; metal star clip far top-left, small lavender washi tape. Minimal modern stationery, negative space.`
- pocket：`Open blush-pink wirebound scrapbook on pale pink cotton bedsheet. Twin-loop rose-gold central binding, ivory pages, soft pink fabric edge, lace and translucent cherry-pink tape at outer corners. Tiny satin ribbon bow upper-right, original strawberry paper cutout bottom-left, blank scalloped note-paper edge under far left.`


素材路径：`public/notebooks/sketch.webp`、`cream.webp`、`travel.webp`、`blue.webp`、`forest.webp`、`film.webp`、`chat.webp`、`pocket.webp`，全部保存在项目内。

内置生成工具输出 PNG，项目只做 WebP 编码压缩以适合手机下载；原始 PNG 保留在生成工具默认输出目录。程序本身不调用图片生成 API，最终用户无需密钥。
