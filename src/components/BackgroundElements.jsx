import React, { useState, useEffect, memo } from 'react';

const BackgroundElements = memo(() => {
  const [elements, setElements] = useState([]);
  
  useEffect(() => {
    const newElements = [];
    const sizes = ['sm', 'md', 'lg'];
    const colors = ['green', 'blue', 'white', 'brown'];
    const delays = ['', 'floating-delay-1', 'floating-delay-2', 'floating-delay-3'];
    
    // Create random platforms
    for (let i = 0; i < 15; i++) {
      newElements.push({
        id: i,
        type: 'platform',
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: sizes[Math.floor(Math.random() * sizes.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: delays[Math.floor(Math.random() * delays.length)],
        rotation: Math.random() * 25 - 12.5,
      });
    }
    
    // Add clouds
    newElements.push({ id: 'cloud-1', type: 'cloud', className: 'cloud cloud-1' });
    newElements.push({ id: 'cloud-2', type: 'cloud', className: 'cloud cloud-2' });
    newElements.push({ id: 'cloud-3', type: 'cloud', className: 'cloud cloud-3' });
    
    setElements(newElements);
  }, []);
  
  return (
    <div className="background-elements">
      {elements.map(element => 
        element.type === 'platform' ? (
          <div 
            key={element.id}
            className={`platform ${element.size} ${element.color} floating ${element.delay}`}
            style={{
              left: `${element.x}%`,
              top: `${element.y}%`,
              '--rotation': `${element.rotation}deg`
            }}
          />
        ) : (
          <div key={element.id} className={element.className} />
        )
      )}
    </div>
  );
});

BackgroundElements.displayName = 'BackgroundElements';

export default BackgroundElements; 