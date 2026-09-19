import { ImageResponse } from "next/og";
import { BrandIcon } from "./brand-icon";

// iOS "Add to Home Screen" icon. iOS applies its own corner mask, so no radius.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<BrandIcon size={size.width} radius={0} />, size);
}
