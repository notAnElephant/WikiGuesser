import Image from "next/image";

interface WikiGuesserLogoProps {
  className?: string;
  size?: number;
}

export function WikiGuesserLogo({
  className,
  size = 36,
}: WikiGuesserLogoProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={size}
      priority
      src="/icons/icon-blue-20260928.png"
      width={size}
    />
  );
}
