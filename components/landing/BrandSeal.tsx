type BrandSealProps = {
  className?: string;
};

/** 「配齐」印章式品牌标：陶土底 + 纸色内框 + 竖排衬线字。 */
export function BrandSeal({ className = '' }: BrandSealProps) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center bg-clay text-paper ${className}`}
      aria-hidden="true"
    >
      <span className="flex h-7 w-7 items-center justify-center border border-paper/60 font-display text-[11px] font-semibold leading-none [writing-mode:vertical-rl]">
        配齐
      </span>
    </span>
  );
}
