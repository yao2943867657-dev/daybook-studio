import type { ThemeId } from './model';

// Original AI-generated blank material plates. Text and user media are drawn separately.
const ids:ThemeId[]=['sketch','cream','travel','blue','forest','film','chat','pocket'];
const images=new Map<ThemeId,HTMLImageElement>();
export async function prepareNotebookAssets():Promise<void>{
  const base=import.meta.env?.BASE_URL??'./';
  await Promise.all(ids.map(async id=>{
    const image=new Image();image.decoding='async';image.src=`${base}notebooks/${id}.webp`;
    try{await image.decode();images.set(id,image);}catch{ /* The native drawing remains usable if an asset fails to load. */ }
  }));
}
export function notebookAsset(id:ThemeId){return images.get(id);}
