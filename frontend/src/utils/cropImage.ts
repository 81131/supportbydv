export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: any,
  rotation = 0
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // 1. Set the canvas to the EXACT size of the crop box requested by the UI
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // 2. Paint the entire background solid white (This acts as the blank A4 paper!)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Create a massive temporary canvas to handle the safe rotation without clipping corners
  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = safeArea;
  tempCanvas.height = safeArea;
  const tempCtx = tempCanvas.getContext('2d');

  if (tempCtx) {
    tempCtx.translate(safeArea / 2, safeArea / 2);
    tempCtx.rotate(getRadianAngle(rotation));
    tempCtx.translate(-safeArea / 2, -safeArea / 2);
    // Draw the uncropped image perfectly centered in the temp canvas
    tempCtx.drawImage(image, safeArea / 2 - image.width / 2, safeArea / 2 - image.height / 2);
  }

  // 4. Calculate the precise mathematical offset to align the rotated image inside the final crop box
  // (This perfectly handles negative coordinates when the user zooms way out!)
  const offsetX = -pixelCrop.x + (safeArea / 2 - image.width / 2);
  const offsetY = -pixelCrop.y + (safeArea / 2 - image.height / 2);

  // 5. Draw the rotated image over the white background
  ctx.drawImage(tempCanvas, Math.round(offsetX), Math.round(offsetY));

  return canvas.toDataURL('image/jpeg', 0.98);
}