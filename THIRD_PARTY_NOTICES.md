# 许可与素材来源

项目源代码与本项目原创绘图：MIT，见 LICENSE。本文对应 v0.3 的素材与依赖范围。

运行时依赖：

- [Mediabunny](https://github.com/Vanilagy/mediabunny)：MPL-2.0。项目通过 npm 依赖集成，未修改库源文件。分发时保留其许可及对应源代码获取说明；锁定版本见 package-lock.json，源码可从对应版本的 npm 包和上游仓库获得。
- [fflate](https://github.com/101arrowz/fflate)：MIT。

Vite 构建会在发布文件中保留依赖的许可注释。源仓库的完整依赖版本记录在 package-lock.json；各包 LICENSE 可在安装后的 node_modules 对应目录查阅。

项目内素材：

- `src/media.ts` 中野餐、小花与海边 SVG 示例：本项目原创，MIT。
- `src/catalog.ts` 中 92 个手绘 SVG（含 32 款聊天表情、8 种动物心情、常用图标、植物、生活插画与原创动物角色）：本项目原创，MIT。旧素材 ID 保留以兼容已有日记。
- `src/renderer.ts` 中本子封面、纸张纹理、撕纸、格纹胶带、纸夹、地图碎片、票根、邮戳、植物与其他模板绘图：本项目程序绘制，MIT。
- `public/notebooks/` 中无文字实物质感手账底图：本项目使用内置 imagegen 生成，提示词与生成记录见 [NOTEBOOK_GENERATION.md](docs/NOTEBOOK_GENERATION.md)。这些是开发时生成后随项目分发的本地资源，使用应用不会向生图服务上传日记。项目在自身可授权的范围内按 MIT 提供使用与再分发，不对 AI 生成素材的独占权作保证。
- `public/icon.svg` 和 PNG 图标：本项目原创，MIT。
- `docs/studio.png`：使用原创示例内容的本项目界面截图，MIT。
- 字体：调用用户设备已安装字体；未捆绑或分发第三方字体文件。

开发与测试依赖：

- [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB)：Apache-2.0，仅用于本地/CI 的 IndexedDB 迁移与存储测试，不作为浏览器运行时依赖打包。
- 其他开发依赖及其确切版本记录在 package-lock.json，许可证保留在各依赖包内。

模板研究参考了 Hobonichi、TRAVELER'S COMPANY、MIDORI、Filofax 的官方产品与使用介绍及真实手账的纸材、装订、拼贴方式，见 [真实手账参考](docs/TEMPLATE_REFERENCES.md)。参考用于研究装订、材质和记录方式，未下载、捆绑或分发其品牌模板、用户照片、贴纸或字体，也不表示品牌合作或背书。

聊天表情与贴纸的研究来源、流行度证据口径见 [贴纸研究](docs/STICKER_REFERENCES.md)。内置角色与 SVG 为本项目原创，不将线条小狗、黄油小熊等商业角色或网上流传的表情包直接改标为 MIT；热门 IP 的官方渠道链接不构成素材再分发授权。Unicode 表情由用户设备的系统字体渲染，项目未捆绑第三方 emoji 图片或字体。

README 中链接的竞品同样仅用于说明研究来源。用户上传的图片、表情包、视频和自定义贴纸不会因此自动获得 MIT 许可；使用与分享权限由上传者自行确认。项目默认示例不包含影视角色、演员素材或第三方商业表情包。
