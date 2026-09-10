import type { ReactNode } from 'react';
import Image from 'next/image';
import correctImage from '@/assets/yansu-correct.png';
import wrongImage from '@/assets/yansu-wrong.png';

export function YansuPreload() {
  return (
    <>
      <link rel="preload" as="image" href={correctImage.src} />
      <link rel="preload" as="image" href={wrongImage.src} />
    </>
  );
}

export function YansuPortrait({
  success,
  small = false,
}: {
  success: boolean;
  small?: boolean;
}) {
  return (
    <Image
      unoptimized
      className={`yansu-portrait ${small ? 'small' : ''}`}
      src={success ? correctImage : wrongImage}
      width={112}
      height={112}
      alt={
        success
          ? '○を掲げるヤンス君'
          : '反対の手で×を持つ、しょんぼりしたヤンス君'
      }
      decoding="async"
    />
  );
}
export function YansuFeedback({
  success,
  children,
}: {
  success: boolean;
  children?: ReactNode;
}) {
  return (
    <span className={`yansu-feedback ${success ? 'yansu-happy' : 'yansu-sad'}`}>
      <YansuPortrait success={success} />
      <span className="yansu-feedback-copy">
        <strong>{success ? '正解でやんす！' : '外れでやんす！'}</strong>
        {children && <span>{children}</span>}
      </span>
    </span>
  );
}
