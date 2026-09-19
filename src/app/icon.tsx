import { ImageResponse } from "next/og";
import { BrandIcon } from "./brand-icon";

// Browser tab / bookmark icon. Generated at build time and cached.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandIcon size={size.width} radius={14} />, size);
}
