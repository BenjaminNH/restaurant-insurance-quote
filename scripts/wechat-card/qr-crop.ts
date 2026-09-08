export interface Point {
  x: number;
  y: number;
}

export interface QrLocation {
  topLeftCorner: Point;
  topRightCorner: Point;
  bottomRightCorner: Point;
  bottomLeftCorner: Point;
}

export interface ImageSize {
  width: number;
  height: number;
}

export interface CropRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function calculateQrCrop(
  location: QrLocation,
  image: ImageSize,
): CropRegion {
  const corners = [
    location.topLeftCorner,
    location.topRightCorner,
    location.bottomRightCorner,
    location.bottomLeftCorner,
  ];
  const minX = Math.min(...corners.map((point) => point.x));
  const maxX = Math.max(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxY = Math.max(...corners.map((point) => point.y));
  const qrSize = Math.max(maxX - minX, maxY - minY);
  const padding = Math.max(8, Math.ceil(qrSize * 0.08));
  const side = Math.min(
    Math.ceil(qrSize + padding * 2),
    image.width,
    image.height,
  );
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    left: clamp(Math.floor(centerX - side / 2), 0, image.width - side),
    top: clamp(Math.floor(centerY - side / 2), 0, image.height - side),
    width: side,
    height: side,
  };
}

export function calculateTemplateCrop(image: ImageSize): CropRegion {
  const side = Math.min(
    Math.round(image.width * 0.77),
    image.width,
    image.height,
  );

  return {
    left: clamp(Math.round(image.width * 0.11), 0, image.width - side),
    top: clamp(Math.round(image.height * 0.27), 0, image.height - side),
    width: side,
    height: side,
  };
}
