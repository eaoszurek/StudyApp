"use client";

import type { InputHTMLAttributes } from "react";

export default function InputField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`input-field ${props.className || ""}`}
    />
  );
}

