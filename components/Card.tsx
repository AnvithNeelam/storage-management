import React from 'react';

const Card = ({ file }: { file: Models.Document }) => {
  return (
    <div className="Card">
      <h2>{file.name}</h2>
    </div>
  );
};

export default Card;