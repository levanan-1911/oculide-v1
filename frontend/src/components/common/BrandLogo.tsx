import Image from 'next/image';

type BrandLogoProps = {
  className?: string;
  size?: number;
};

export default function BrandLogo({ className, size = 42 }: BrandLogoProps) {
  return (
    <Image
      src="/oculide-logo.png"
      alt="Oculide"
      width={size}
      height={size}
      className={className}
    />
  );
}
