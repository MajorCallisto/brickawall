"use client";

import { useRef } from "react";
import { easing } from "maath";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

const FONT_URL = "/fonts/inter-800.woff";

type WallLabelProps = {
  text: string;
  /** World position of the text's baseline centre. */
  position: [number, number, number];
  visible: boolean;
  fontSize?: number;
  color?: string;
};

/**
 * Large text standing in the scene behind the wall, faded in and out. It is
 * real geometry, so glass bricks refract it.
 */
export function WallLabel({
  text,
  position,
  visible,
  fontSize = 1.4,
  color = "#3e3e3d",
}: WallLabelProps) {
  const opacity = useRef({ value: 0 });
  // Text's material is created by troika; we drive its opacity each frame.
  const ref = useRef<{ fillOpacity: number } | null>(null);

  useFrame((_, delta) => {
    easing.damp(opacity.current, "value", visible ? 1 : 0, 0.25, delta);
    if (ref.current) ref.current.fillOpacity = opacity.current.value;
  });

  return (
    <Text
      ref={ref}
      font={FONT_URL}
      fontSize={fontSize}
      letterSpacing={0.08}
      anchorX="center"
      anchorY="bottom-baseline"
      position={position}
      color={color}
      fillOpacity={0}
      maxWidth={14}
      textAlign="center"
    >
      {text}
    </Text>
  );
}
