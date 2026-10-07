import React from 'react';

export const FALLBACK_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Crect width='18' height='18' x='3' y='3' rx='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";

const BASE_URL = (import.meta as any).env?.BASE_URL || '/';
const CLEAN_BASE = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;

/**
 * Retorna a URL da imagem do recurso, priorizando o asset local empacotado no app (anti-SPOF)
 * e mantendo a CDN do sfl.world como fallback em cascata.
 */
export function getItemImageUrl(itemName: string): string {
  if (!itemName) return FALLBACK_SVG;
  const encoded = encodeURIComponent(itemName);
  return `${CLEAN_BASE}assets/items/${encoded}.png`;
}

/**
 * Handler de erro resiliente: se falhar o asset local, tenta a CDN remota;
 * se a remota também falhar, renderiza o FALLBACK_SVG sem loop infinito.
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget as HTMLImageElement;
  const currentSrc = target.src || '';

  // Se falhou o asset local empacotado, tenta a CDN remota
  if (currentSrc.includes('/assets/items/')) {
    const fileName = currentSrc.split('/assets/items/').pop();
    if (fileName) {
      target.src = `https://sfl.world/img/source/${fileName}`;
      return;
    }
  }

  // Se já falhou na remota ou era outra imagem/NFT, exibe o SVG sem loop
  target.onerror = null;
  target.src = FALLBACK_SVG;
}
