/**
 * Share Card Service (Vedlegg C.18)
 * Genererer stilrene bildekort via HTML5 Canvas for deling på sosiale medier, Teams, Slack og meldinger.
 */

export interface ShareCardData {
  type: 'challenge' | 'workout' | 'record' | 'group';
  title: string;
  subtitle: string;
  statMain: string;
  statLabel: string;
  badgeIcon?: string;
  badgeName?: string;
  accentColor?: string; // default: #10b981 (emerald)
}

/**
 * Rendrer et 1080x1080 Canvas-bildekort og returnerer Blob
 */
export async function generateShareCardBlob(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Kunne ikke hente 2D Canvas context');
  }

  // 1. Bakgrunn med dyp mørk gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
  bgGrad.addColorStop(0, '#09090b'); // zinc-950
  bgGrad.addColorStop(0.5, '#18181b'); // zinc-900
  bgGrad.addColorStop(1, '#052e16'); // emerald-950
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1080);

  // 2. Ytre og indre dekorativ ramme
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, 1000, 1000);

  ctx.strokeStyle = data.accentColor || '#10b981';
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, 976, 976);

  // 3. Topp-branding: "MIN TRENER"
  ctx.fillStyle = data.accentColor || '#10b981';
  ctx.font = '900 32px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MIN TRENER', 540, 120);

  ctx.fillStyle = '#a1a1aa'; // zinc-400
  ctx.font = '600 20px system-ui, -apple-system, sans-serif';
  ctx.fillText('mintrener.web.app', 540, 155);

  // 4. Stor Ikon / Badge Sirkel
  const circleY = 340;
  ctx.beginPath();
  ctx.arc(540, circleY, 110, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = data.accentColor || '#10b981';
  ctx.stroke();

  // Badge Emoji / Ikon
  ctx.font = '100px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.badgeIcon || '🏆', 540, circleY);

  // 5. Tittel & Undertittel
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 52px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.title, 540, 530);

  ctx.fillStyle = '#d4d4d8'; // zinc-300
  ctx.font = '500 28px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.subtitle, 540, 580);

  // 6. Hovedtall / Statistikkboks
  const boxY = 640;
  const boxW = 800;
  const boxH = 220;
  const boxX = (1080 - boxW) / 2;

  ctx.fillStyle = 'rgba(24, 24, 27, 0.85)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = data.accentColor || '#34d399';
  ctx.font = '900 72px system-ui, -apple-system, monospace';
  ctx.fillText(data.statMain, 540, boxY + 110);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '700 24px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.statLabel.toUpperCase(), 540, boxY + 165);

  // 7. Bunntekst / Motivasjon
  ctx.fillStyle = '#71717a'; // zinc-500
  ctx.font = '600 20px system-ui, -apple-system, sans-serif';
  ctx.fillText('Gratis, reklamefri og åpen kildekode trening', 540, 960);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Klarte ikke å lage bilde-blob'));
    }, 'image/png');
  });
}

/**
 * Deler bildekort via Native Web Share API eller laster ned
 */
export async function shareOrDownloadCard(data: ShareCardData, filename: string = 'mintrener-bragd.png'): Promise<{ shared: boolean; downloaded: boolean }> {
  try {
    const blob = await generateShareCardBlob(data);
    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: data.title,
        text: `${data.title} - ${data.subtitle} #MinTrener`,
      });
      return { shared: true, downloaded: false };
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return { shared: false, downloaded: false };
    }
    console.warn('Web Share feilet, faller tilbake til filnedlasting:', e);
  }

  // Fallback: Last ned fil
  try {
    const blob = await generateShareCardBlob(data);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { shared: false, downloaded: true };
  } catch (e) {
    console.error('Nedlasting feilet:', e);
    return { shared: false, downloaded: false };
  }
}
