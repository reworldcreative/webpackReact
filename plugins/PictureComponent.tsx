import React from "react";

const PictureComponent: React.FC<{
  id?: string;
  src: string;
  alt?: string;
  className?: string;
}> = ({ id, src, alt, className }) => {
  const webpSrc = src.replace(/\.\w+$/, ".webp");

  return (
    <picture>
      <source type="image/webp" srcSet={webpSrc} />
      <img id={id} src={src} alt={alt} className={className} />
    </picture>
  );
};

export default PictureComponent;
