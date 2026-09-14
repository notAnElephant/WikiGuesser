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
      src="/icons/wikiguesser-logo.png"
      width={size}
    />
  );
}
